import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import socket from "@/lib/socket";
import { useUser } from "@/lib/AuthContext";
import { ICE_SERVERS, MAX_CALL_PARTICIPANTS, CHUNK_SIZE, MAX_FILE_SIZE } from "@/lib/iceServers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare, ScreenShareOff, PhoneOff,
  Hand, MessageSquare, Users, Circle, Square, Lock, Unlock, RotateCcw, Send, Paperclip, Gauge,
} from "lucide-react";

interface Participant {
  socketId: string;
  userId?: string;
  name: string;
  image?: string;
  muted?: boolean;
  cameraOff?: boolean;
  raisedHand?: boolean;
  isHost?: boolean;
  isCoHost?: boolean;
}

interface ChatMsg { from: string; name: string; text?: string; file?: { name: string; url: string }; at: number }

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const EMOJIS = ["😀", "😂", "👍", "❤️", "🎉", "👏", "🙌", "🔥", "😮", "🤔"];

export default function CallRoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { user } = useUser();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const fileReassembly = useRef<Map<string, { meta: any; chunks: string[] }>>(new Map());
  const analysers = useRef<Map<string, { ctx: AudioContext; analyser: AnalyserNode; raf: number }>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [selfId, setSelfId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [locked, setLocked] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [quality, setQuality] = useState<Map<string, "good" | "fair" | "poor">>(new Map());

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [recording, setRecording] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [duration, setDuration] = useState(0);
  const [noPermission, setNoPermission] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Speaking indicator: watch a stream's volume via Web Audio ---
  const watchSpeaking = (id: string, stream: MediaStream) => {
    if (!stream.getAudioTracks().length) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setSpeaking((prev) => {
          const next = new Set(prev);
          avg > 20 ? next.add(id) : next.delete(id);
          return next;
        });
        const raf = requestAnimationFrame(tick);
        const entry = analysers.current.get(id);
        if (entry) entry.raf = raf;
      };
      const raf = requestAnimationFrame(tick);
      analysers.current.set(id, { ctx, analyser, raf });
    } catch (error) {
      console.log("Speaking detection unavailable", error);
    }
  };

  const stopWatchingSpeaking = (id: string) => {
    const entry = analysers.current.get(id);
    if (entry) {
      cancelAnimationFrame(entry.raf);
      entry.ctx.close().catch(() => {});
      analysers.current.delete(id);
    }
  };

  // --- Connection quality polling ---
  useEffect(() => {
    const interval = setInterval(async () => {
      const next = new Map(quality);
      for (const [id, pc] of peerConnections.current) {
        try {
          const stats = await pc.getStats();
          let rtt = 0;
          stats.forEach((r: any) => {
            if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime) {
              rtt = r.currentRoundTripTime;
            }
          });
          next.set(id, rtt < 0.15 ? "good" : rtt < 0.4 ? "fair" : "poor");
        } catch (error) {
          // ignore
        }
      }
      setQuality(next);
    }, 4000);
    return () => clearInterval(interval);
  }, [participants]);

  // --- Data channel: handles chat text + chunked file transfer ---
  const handleDataChannelMessage = (raw: string) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "chat") {
        setChatMessages((prev) => [...prev, { from: msg.from, name: msg.name, text: msg.text, at: Date.now() }]);
      } else if (msg.type === "file-meta") {
        fileReassembly.current.set(msg.id, { meta: msg, chunks: [] });
      } else if (msg.type === "file-chunk") {
        fileReassembly.current.get(msg.id)?.chunks.push(msg.data);
      } else if (msg.type === "file-end") {
        const entry = fileReassembly.current.get(msg.id);
        if (!entry) return;
        const byteArrays = entry.chunks.map((b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
        const blob = new Blob(byteArrays, { type: entry.meta.mime });
        const url = URL.createObjectURL(blob);
        setChatMessages((prev) => [...prev, { from: entry.meta.from, name: entry.meta.name, file: { name: entry.meta.filename, url }, at: Date.now() }]);
        fileReassembly.current.delete(msg.id);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const setupDataChannel = (id: string, channel: RTCDataChannel) => {
    channel.onmessage = (e) => handleDataChannelMessage(e.data);
    dataChannels.current.set(id, channel);
  };

  const broadcastToDataChannels = (payload: any) => {
    const json = JSON.stringify(payload);
    for (const channel of dataChannels.current.values()) {
      if (channel.readyState === "open") channel.send(json);
    }
  };

  // --- Peer connection lifecycle ---
  const createPeerConnection = (peerId: string, isOfferer: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnections.current.set(peerId, pc);

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("call:signal", { to: peerId, data: { candidate: e.candidate } });
    };

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(peerId, e.streams[0]);
        return next;
      });
      watchSpeaking(peerId, e.streams[0]);
    };

    if (isOfferer) {
      const channel = pc.createDataChannel("chat-and-files");
      setupDataChannel(peerId, channel);
    } else {
      pc.ondatachannel = (e) => setupDataChannel(peerId, e.channel);
    }

    return pc;
  };

  const flushPendingCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidates.current.get(peerId) || [];
    for (const c of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (error) {
        console.log(error);
      }
    }
    pendingCandidates.current.delete(peerId);
  };

  const makeOffer = async (peerId: string) => {
    const pc = createPeerConnection(peerId, true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call:signal", { to: peerId, data: { sdp: offer } });
  };

  const closePeer = (peerId: string) => {
    peerConnections.current.get(peerId)?.close();
    peerConnections.current.delete(peerId);
    dataChannels.current.delete(peerId);
    stopWatchingSpeaking(peerId);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  };

  // --- Join the room once local media (or a fallback) is ready ---
  useEffect(() => {
    if (!roomId || typeof roomId !== "string" || !user) return;
    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) return;
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (error) {
        // Camera/mic permission denied or unavailable -- join as
        // view/listen-only instead of failing entirely.
        setNoPermission(true);
      }

      socket.emit(
        "call:join",
        { roomId, name: user.name, image: user.image, userId: user._id },
        (res: any) => {
          if (cancelled) return;
          if (res.error) {
            setJoinError(res.error);
            return;
          }
          setSelfId(res.selfId);
          setIsHost(res.isHost);
          setParticipants(res.participants);
          setJoined(true);
          // I'm the new joiner -- offer to everyone already here.
          res.participants.forEach((p: Participant) => makeOffer(p.socketId));
        }
      );
    };
    setup();

    return () => {
      cancelled = true;
    };
  }, [roomId, user?._id]);

  // --- Socket event wiring ---
  useEffect(() => {
    const onSignal = async ({ from, data }: any) => {
      let pc = peerConnections.current.get(from);
      if (data.sdp) {
        if (!pc) pc = createPeerConnection(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushPendingCandidates(from, pc);
        if (data.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("call:signal", { to: from, data: { sdp: answer } });
        }
      } else if (data.candidate) {
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          const queue = pendingCandidates.current.get(from) || [];
          queue.push(data.candidate);
          pendingCandidates.current.set(from, queue);
        }
      }
    };

    const onParticipantJoined = (p: Participant) => setParticipants((prev) => [...prev, p]);
    const onParticipantLeft = ({ socketId }: any) => {
      closePeer(socketId);
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    };
    const onParticipantUpdated = (update: any) => {
      setParticipants((prev) => prev.map((p) => (p.socketId === update.socketId ? { ...p, ...update } : p)));
    };
    const onForceMute = () => applyMute(true);
    const onRemoved = () => {
      alert("You were removed from this meeting by the host.");
      router.push("/call");
    };
    const onRoomLocked = ({ locked }: any) => setLocked(locked);

    socket.on("call:signal", onSignal);
    socket.on("call:participant-joined", onParticipantJoined);
    socket.on("call:participant-left", onParticipantLeft);
    socket.on("call:participant-updated", onParticipantUpdated);
    socket.on("call:force-mute", onForceMute);
    socket.on("call:removed", onRemoved);
    socket.on("call:room-locked", onRoomLocked);

    return () => {
      socket.off("call:signal", onSignal);
      socket.off("call:participant-joined", onParticipantJoined);
      socket.off("call:participant-left", onParticipantLeft);
      socket.off("call:participant-updated", onParticipantUpdated);
      socket.off("call:force-mute", onForceMute);
      socket.off("call:removed", onRemoved);
      socket.off("call:room-locked", onRoomLocked);
    };
  }, []);

  // --- Reconnection: Socket.IO auto-reconnects the transport, but our room
  // membership and peer connections need to be rebuilt from scratch. ---
  useEffect(() => {
    const onReconnect = () => {
      if (!joined || typeof roomId !== "string" || !user) return;
      for (const id of Array.from(peerConnections.current.keys())) closePeer(id);
      socket.emit("call:join", { roomId, name: user.name, image: user.image, userId: user._id }, (res: any) => {
        if (res.error) return;
        setParticipants(res.participants);
        res.participants.forEach((p: Participant) => makeOffer(p.socketId));
      });
    };
    socket.io.on("reconnect", onReconnect);
    return () => {
      socket.io.off("reconnect", onReconnect);
    };
  }, [joined, roomId, user?._id]);

  // --- Call duration timer ---
  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [joined]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      for (const id of Array.from(peerConnections.current.keys())) closePeer(id);
      socket.emit("call:leave");
    };
  }, []);

  // --- Controls ---
  const applyMute = (value: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !value));
    setMuted(value);
    socket.emit("call:toggle-mute", { muted: value });
  };
  const toggleMute = () => applyMute(!muted);

  const toggleCamera = () => {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
    socket.emit("call:toggle-camera", { cameraOff: next });
  };

  const toggleRaiseHand = () => {
    const next = !raisedHand;
    setRaisedHand(next);
    socket.emit("call:raise-hand", { raised: next });
  };

  const replaceOutgoingVideoTrack = (track: MediaStreamTrack) => {
    for (const pc of peerConnections.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(track);
    }
  };

  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        replaceOutgoingVideoTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;
        screenTrack.onended = () => stopScreenShare(); // user clicked the browser's native "Stop sharing"
        setScreenSharing(true);
      } catch (error) {
        console.log("Screen share cancelled or unavailable", error);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (cameraTrackRef.current) {
      replaceOutgoingVideoTrack(cameraTrackRef.current);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    }
    setScreenSharing(false);
  };

  const flipCamera = async () => {
    try {
      const currentFacing = cameraTrackRef.current?.getSettings().facingMode;
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacing === "environment" ? "user" : "environment" },
      });
      const newTrack = newStream.getVideoTracks()[0];
      cameraTrackRef.current?.stop();
      cameraTrackRef.current = newTrack;
      if (!screenSharing) {
        replaceOutgoingVideoTrack(newTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.log("Camera flip unavailable (likely a desktop with one camera)", error);
    }
  };

  const toggleLowBandwidth = () => {
    const next = !lowBandwidth;
    for (const pc of peerConnections.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) continue;
      const params = sender.getParameters();
      params.encodings = [{ maxBitrate: next ? 150_000 : 2_500_000 }];
      sender.setParameters(params).catch(() => {});
    }
    setLowBandwidth(next);
  };

  // Records only YOUR OWN camera+mic locally -- not a mixed recording of
  // everyone in the call. A true "record the whole meeting" feature needs
  // server-side media compositing (an SFU), which this mesh architecture
  // doesn't have.
  const toggleRecording = () => {
    if (!recording) {
      if (!localStreamRef.current) return;
      recordedChunks.current = [];
      const recorder = new MediaRecorder(localStreamRef.current);
      recorder.ondataavailable = (e) => e.data.size > 0 && recordedChunks.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `my-camera-${Date.now()}.webm`;
        a.click();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } else {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    }
  };

  const toggleLock = () => {
    const next = !locked;
    setLocked(next);
    socket.emit("call:lock", { locked: next });
  };

  const requestMute = (targetSocketId: string) => socket.emit("call:request-mute", { targetSocketId });
  const removeParticipant = (targetSocketId: string) => {
    if (confirm("Remove this participant from the call?")) socket.emit("call:remove-participant", { targetSocketId });
  };
  const assignCoHost = (targetSocketId: string) => socket.emit("call:assign-cohost", { targetSocketId });

  const sendChat = () => {
    if (!chatInput.trim()) return;
    broadcastToDataChannels({ type: "chat", from: selfId, name: user?.name, text: chatInput });
    setChatMessages((prev) => [...prev, { from: selfId, name: "You", text: chatInput, at: Date.now() }]);
    setChatInput("");
  };

  const sendFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large -- peer-to-peer sharing here is capped at ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }
    const id = crypto.randomUUID();
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    broadcastToDataChannels({ type: "file-meta", id, from: selfId, name: user?.name, filename: file.name, mime: file.type });
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      const b64 = btoa(String.fromCharCode(...chunk));
      broadcastToDataChannels({ type: "file-chunk", id, data: b64 });
    }
    broadcastToDataChannels({ type: "file-end", id });
    setChatMessages((prev) => [...prev, { from: selfId, name: "You", file: { name: file.name, url: URL.createObjectURL(file) }, at: Date.now() }]);
  };

  const leaveCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    socket.emit("call:leave");
    router.push("/call");
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/call/${roomId}`);
    alert("Meeting link copied to clipboard");
  };

  if (!user) return <main className="flex-1 p-6">Sign in to join this call.</main>;
  if (joinError) return <main className="flex-1 p-6 text-red-600">{joinError}</main>;

  const isHostOrCoHost = (id: string) => id === selfId && (isHost || participants.find((p) => p.socketId === selfId)?.isCoHost);

  return (
    <main className="flex-1 flex flex-col h-[calc(100vh-56px)] bg-neutral-900 text-white">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-950 text-sm">
        <div className="flex items-center gap-3">
          <span>{formatDuration(duration)}</span>
          <span className="text-gray-400">{participants.length + 1} in call</span>
          {locked && <Lock className="w-4 h-4 text-amber-400" />}
        </div>
        <Button variant="ghost" size="sm" onClick={copyInviteLink}>Copy invite link</Button>
      </div>

      {noPermission && (
        <div className="bg-amber-900/40 text-amber-200 text-xs px-4 py-1.5 text-center">
          Camera/microphone access was denied — you've joined in view-only mode.
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 p-2 auto-rows-fr overflow-auto">
          <div className={`relative rounded-lg overflow-hidden bg-black ${speaking.has("local") ? "ring-2 ring-green-500" : ""}`}>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <span className="absolute bottom-1 left-1 text-xs bg-black/60 px-1.5 py-0.5 rounded">You {isHost && "👑"}</span>
            {muted && <MicOff className="absolute top-1 right-1 w-4 h-4 text-red-400" />}
          </div>

          {participants.map((p) => {
            const stream = remoteStreams.get(p.socketId);
            return (
              <div key={p.socketId} className={`relative rounded-lg overflow-hidden bg-black ${speaking.has(p.socketId) ? "ring-2 ring-green-500" : ""}`}>
                {stream && !p.cameraOff ? (
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-2xl font-medium">
                    {p.name?.[0] || "?"}
                  </div>
                )}
                <span className="absolute bottom-1 left-1 text-xs bg-black/60 px-1.5 py-0.5 rounded">
                  {p.name} {p.isHost && "👑"}{p.isCoHost && "⭐"}
                </span>
                {p.muted && <MicOff className="absolute top-1 right-1 w-4 h-4 text-red-400" />}
                {p.raisedHand && <Hand className="absolute top-1 left-1 w-4 h-4 text-yellow-400" />}
                <span
                  className={`absolute top-1 right-6 w-2 h-2 rounded-full ${
                    quality.get(p.socketId) === "good" ? "bg-green-500" : quality.get(p.socketId) === "fair" ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  title={`Connection: ${quality.get(p.socketId) || "connecting"}`}
                />
              </div>
            );
          })}
        </div>

        {showParticipants && (
          <div className="w-72 bg-neutral-950 p-3 overflow-y-auto text-sm">
            <h3 className="font-medium mb-2">Participants ({participants.length + 1})</h3>
            <div className="flex justify-between items-center py-1.5">
              <span>You {isHost && "(Host)"}</span>
            </div>
            {participants.map((p) => (
              <div key={p.socketId} className="flex justify-between items-center py-1.5 border-t border-neutral-800">
                <span>{p.name} {p.isHost && "(Host)"}{p.isCoHost && "(Co-host)"}</span>
                {(isHost || participants.find((x) => x.socketId === selfId)?.isCoHost) && !p.isHost && (
                  <div className="flex gap-1">
                    <button title="Request mute" onClick={() => requestMute(p.socketId)}><MicOff className="w-3.5 h-3.5" /></button>
                    {isHost && <button title="Make co-host" onClick={() => assignCoHost(p.socketId)}>⭐</button>}
                    <button title="Remove" onClick={() => removeParticipant(p.socketId)} className="text-red-400">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showChat && (
          <div className="w-80 bg-neutral-950 flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {chatMessages.map((m, i) => (
                <div key={i}>
                  <span className="font-medium">{m.name}: </span>
                  {m.text && <span>{m.text}</span>}
                  {m.file && (
                    <a href={m.file.url} download={m.file.name} className="text-blue-400 underline">📎 {m.file.name}</a>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-1 p-1 border-t border-neutral-800 flex-wrap">
              {EMOJIS.map((e) => (
                <button key={e} className="text-lg" onClick={() => setChatInput((v) => v + e)}>{e}</button>
              ))}
            </div>
            <div className="flex gap-1 p-2 border-t border-neutral-800">
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
              <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-4 h-4" /></Button>
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Message"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
              <Button size="icon" onClick={sendChat}><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 py-3 bg-neutral-950 flex-wrap">
        <Button variant={muted ? "destructive" : "secondary"} size="icon" onClick={toggleMute} title="Toggle mic (mic controlled by your browser hardware)">
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button variant={cameraOff ? "destructive" : "secondary"} size="icon" onClick={toggleCamera}>
          {cameraOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </Button>
        <Button variant={screenSharing ? "default" : "secondary"} size="icon" onClick={toggleScreenShare}>
          {screenSharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
        </Button>
        <Button variant="secondary" size="icon" onClick={flipCamera} title="Flip camera (mobile)"><RotateCcw className="w-5 h-5" /></Button>
        <Button variant={raisedHand ? "default" : "secondary"} size="icon" onClick={toggleRaiseHand}><Hand className="w-5 h-5" /></Button>
        <Button variant={lowBandwidth ? "default" : "secondary"} size="icon" onClick={toggleLowBandwidth} title="Low bandwidth mode"><Gauge className="w-5 h-5" /></Button>
        <Button variant={recording ? "destructive" : "secondary"} size="icon" onClick={toggleRecording} title="Record my camera only">
          {recording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setShowParticipants(!showParticipants)}><Users className="w-5 h-5" /></Button>
        <Button variant="secondary" size="icon" onClick={() => setShowChat(!showChat)}><MessageSquare className="w-5 h-5" /></Button>
        {isHost && (
          <Button variant="secondary" size="icon" onClick={toggleLock} title="Lock meeting">
            {locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </Button>
        )}
        <Button variant="destructive" size="icon" onClick={leaveCall}><PhoneOff className="w-5 h-5" /></Button>
      </div>
    </main>
  );
}
