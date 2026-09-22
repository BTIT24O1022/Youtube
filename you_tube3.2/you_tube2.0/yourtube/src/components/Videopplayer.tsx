"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { setActivePlayer } from "@/lib/activePlayer";
import {
  Play, Pause, Volume2, VolumeX, PictureInPicture2,
  Maximize, Minimize, Rewind, FastForward, Subtitles, RectangleHorizontal,
} from "lucide-react";

import { getMediaUrl } from "@/lib/utils";

interface VideoPlayerProps {
  video: { _id: string; videotitle: string; filepath: string };
  nextVideo?: { _id: string; videotitle: string } | null;
  theater?: boolean;
  onToggleTheater?: () => void;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VideoPlayer({ video, nextVideo, theater, onToggleTheater }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const router = useRouter();
  const lastSaved = useRef(0);
  const hideControlsTimer = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resolution, setResolution] = useState<string>("");  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{ x: number; time: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
  const countdownTimer = useRef<any>(null);

  // --- Resume playback where the user left off ("Continue Watching") ---
  const resumeAt = useRef(0);
  useEffect(() => {
    if (!user) return;
    axiosInstance
      .get(`/history/progress/${video._id}`)
      .then((res) => (resumeAt.current = res.data.progress || 0))
      .catch(() => {});
  }, [video._id, user?._id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setLoadError(null);
    const onLoaded = () => {
      setDuration(el.duration || 0);
      setHasCaptions(el.textTracks.length > 0);
      // This reflects the actual file's real resolution -- there's only one
      // rendition of each uploaded video (no adaptive-bitrate transcoding
      // pipeline here), so there's nothing to "select" the way YouTube's
      // quality menu does. Showing the true resolution is honest; faking a
      // quality picker with no real alternate streams behind it wouldn't be.
      const h = el.videoHeight;
      const label = h >= 2160 ? "4K" : h >= 1440 ? "1440p" : h >= 1080 ? "1080p" : h >= 720 ? "720p" : h >= 480 ? "480p" : h > 0 ? "360p" : "";
      setResolution(label ? `${label} (${el.videoWidth}×${el.videoHeight})` : "");
      if (resumeAt.current && resumeAt.current < el.duration - 10) {
        el.currentTime = resumeAt.current;
      }
      setLoading(false);
    };
    el.addEventListener("loadedmetadata", onLoaded);

    // If the video genuinely can't load (wrong path, backend not running,
    // corrupt file), surface that clearly instead of spinning forever --
    // that was the actual bug: the old code only ever cleared `loading` on
    // "loadedmetadata"/"playing", so if the browser never even got that far,
    // the spinner had no way to go away or explain what happened.
    const onError = () => {
      setLoading(false);
      const code = el.error?.code;
      const pathStr = video?.filepath || "";
      const isAbsolute = pathStr.startsWith("/") || pathStr.includes(":") || pathStr.includes("\\");
      const reason =
        code === 4 || isAbsolute
          ? "This video's media file was uploaded on a different machine and is not present on the current server's storage disk. Please re-upload the video."
          : code === 2
          ? "Network error while loading the video -- check that the backend server is running."
          : "This video's media file is unavailable. Please re-upload the video.";
      setLoadError(reason);
    };
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("error", onError);
    };
  }, [video._id]);

  // --- Save progress periodically (every ~10s of actual playback) ---
  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (el.buffered.length > 0) {
      setBuffered(el.buffered.end(el.buffered.length - 1));
    }
    if (user && el.currentTime - lastSaved.current >= 10) {
      lastSaved.current = el.currentTime;
      axiosInstance
        .post(`/history/progress/${video._id}`, {
          progress: Math.floor(el.currentTime),
          duration: Math.floor(el.duration || 0),
        })
        .catch(() => {});
    }
  };

  // --- Play / pause, ensuring only one video plays at a time on the page ---
  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      setActivePlayer(el);
      el.play();
    } else {
      el.pause();
    }
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  const seekBy = (delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + delta), el.duration || 0);
  };

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };

  // Hover preview: shows the timestamp under the cursor, not an actual video
  // frame thumbnail (that needs pre-generated sprite sheets from a backend
  // pipeline this project doesn't have -- this is the honest, simplified version).
  const handleSeekHover = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHoverPreview({ x: e.clientX - rect.left, time: ratio * duration });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const v = Number(e.target.value);
    el.volume = v;
    setVolume(v);
    setMuted(v === 0);
    el.muted = v === 0;
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const changeSpeed = (s: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  };

  const togglePiP = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
      }
    } catch (error) {
      console.log("PiP not available", error);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleCaptions = () => {
    const el = videoRef.current;
    if (!el || el.textTracks.length === 0) return;
    const track = el.textTracks[0];
    track.mode = track.mode === "showing" ? "hidden" : "showing";
    setCaptionsOn(track.mode === "showing");
  };

  // --- Auto-hide controls after a few seconds of no mouse movement ---
  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3000);
  };

  // --- Autoplay-next countdown when the video ends ---
  const cancelAutoplay = () => {
    setAutoplayCountdown(null);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  };

  const handleEnded = () => {
    if (user) {
      axiosInstance
        .post(`/history/progress/${video._id}`, { progress: Math.floor(duration), duration: Math.floor(duration) })
        .catch(() => {});
    }
    if (!nextVideo) return;
    let secondsLeft = 5;
    setAutoplayCountdown(secondsLeft);
    countdownTimer.current = setInterval(() => {
      secondsLeft -= 1;
      setAutoplayCountdown(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(countdownTimer.current);
        router.push(`/watch/${nextVideo._id}`);
      }
    }, 1000);
  };

  // --- Keyboard shortcuts (ignored while typing in an input/textarea) ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const el = videoRef.current;
      if (!el) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          seekBy(e.shiftKey ? -30 : -10);
          break;
        case "ArrowRight":
          seekBy(e.shiftKey ? 30 : 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          el.volume = Math.min(1, el.volume + 0.05);
          setVolume(el.volume);
          break;
        case "ArrowDown":
          e.preventDefault();
          el.volume = Math.max(0, el.volume - 0.05);
          setVolume(el.volume);
          break;
        case "m":
          toggleMute();
          break;
        case "p":
          togglePiP();
          break;
        case "t":
          onToggleTheater?.();
          break;
        case "c":
          toggleCaptions();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "n":
          if (nextVideo) router.push(`/watch/${nextVideo._id}`);
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, nextVideo, onToggleTheater]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group select-none"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        onEnded={handleEnded}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
      >
        <source src={getMediaUrl(video?.filepath)} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 gap-2">
          <p className="font-medium">⚠ {loadError}</p>
          <p className="text-xs text-gray-400">Source: {video?.filepath}</p>
        </div>
      )}

      {loading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {!isPlaying && !loading && !loadError && autoplayCountdown === null && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <div className="bg-white/90 rounded-full p-4">
            <Play className="w-8 h-8 text-black" fill="black" />
          </div>
        </button>
      )}

      {autoplayCountdown !== null && nextVideo && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white gap-3">
          <p className="text-sm text-gray-300">Up next</p>
          <p className="font-medium">{nextVideo.videotitle}</p>
          <p className="text-2xl">{autoplayCountdown}</p>
          <div className="flex gap-2">
            <button
              className="bg-white text-black px-4 py-1.5 rounded-full text-sm"
              onClick={() => router.push(`/watch/${nextVideo._id}`)}
            >
              Play now
            </button>
            <button className="bg-gray-700 px-4 py-1.5 rounded-full text-sm" onClick={cancelAutoplay}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 transition-opacity ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Seek bar */}
        <div className="relative mb-1">
          {hoverPreview && (
            <div
              className="absolute -top-7 bg-black text-white text-xs px-1.5 py-0.5 rounded pointer-events-none"
              style={{ left: Math.max(0, hoverPreview.x - 16) }}
            >
              {formatTime(hoverPreview.time)}
            </div>
          )}
          <div className="relative h-1 rounded bg-white/20 overflow-hidden">
            <div className="absolute h-full bg-white/40" style={{ width: `${(buffered / (duration || 1)) * 100}%` }} />
            <div className="absolute h-full bg-red-600" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeekBar}
            onMouseMove={handleSeekHover}
            onMouseLeave={() => setHoverPreview(null)}
            className="absolute inset-0 w-full h-3 -top-1 opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2 text-white">
          <button onClick={togglePlay}>{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
          <button onClick={() => seekBy(-10)} title="Back 10s"><Rewind className="w-4 h-4" /></button>
          <button onClick={() => seekBy(10)} title="Forward 10s"><FastForward className="w-4 h-4" /></button>

          <div className="flex items-center gap-1 group/vol">
            <button onClick={toggleMute}>{muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 accent-red-600"
            />
          </div>

          <button
            className="text-xs tabular-nums"
            onClick={() => setShowRemaining(!showRemaining)}
            title="Click to toggle remaining time"
          >
            {showRemaining
              ? `-${formatTime(duration - currentTime)}`
              : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </button>

          <div className="flex-1" />

          {resolution && (
            <span className="text-xs text-gray-300 px-1" title="Source video resolution">{resolution}</span>
          )}

          <div className="relative">
            <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} title="Playback speed" className="text-xs px-1">
              {speed}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-6 right-0 bg-black/90 rounded text-xs py-1 w-16">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`block w-full text-left px-2 py-1 hover:bg-white/10 ${s === speed ? "text-red-500" : ""}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleCaptions}
            title={hasCaptions ? "Toggle captions" : "No captions available for this video"}
            className={`${!hasCaptions ? "opacity-40 cursor-not-allowed" : ""} ${captionsOn ? "text-red-500" : ""}`}
            disabled={!hasCaptions}
          >
            <Subtitles className="w-4 h-4" />
          </button>

          <button onClick={togglePiP} title="Picture in picture"><PictureInPicture2 className="w-4 h-4" /></button>
          <button onClick={onToggleTheater} title="Theater mode (t)" className={theater ? "text-red-500" : ""}>
            <RectangleHorizontal className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} title="Fullscreen (f)">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
