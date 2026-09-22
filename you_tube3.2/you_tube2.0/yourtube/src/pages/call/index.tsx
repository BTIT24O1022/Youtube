import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/AuthContext";
import socket from "@/lib/socket";
import { Video } from "lucide-react";

const CallLandingPage = () => {
  const { user } = useUser();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);

  const startCall = () => {
    if (!user) return;
    setCreating(true);
    socket.emit("call:create-room", {}, (res: { roomId: string }) => {
      router.push(`/call/${res.roomId}`);
    });
  };

  const joinCall = () => {
    if (!joinCode.trim()) return;
    router.push(`/call/${joinCode.trim()}`);
  };

  if (!user) return <main className="flex-1 p-6">Sign in to start or join a video call.</main>;

  return (
    <main className="flex-1 p-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <Video className="w-12 h-12 mx-auto text-red-600 mb-3" />
        <h1 className="text-2xl font-semibold">Video Calls</h1>
        <p className="text-sm text-gray-500 mt-1">Start a new meeting or join one with a code.</p>
      </div>

      <div className="space-y-6">
        <Button className="w-full" size="lg" onClick={startCall} disabled={creating}>
          {creating ? "Creating meeting..." : "Start a new call"}
        </Button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" /> OR <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Enter meeting code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinCall()}
          />
          <Button variant="outline" onClick={joinCall} disabled={!joinCode.trim()}>Join</Button>
        </div>
      </div>
    </main>
  );
};

export default CallLandingPage;
