"use client";
import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getMediaUrl, formatDuration } from "@/lib/utils";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface VideoCardProps {
  video: any;
  isOwner?: boolean;
  onDelete?: (videoId: string) => void;
}

export default function VideoCard({ video, isOwner = false, onDelete }: VideoCardProps) {
  const [duration, setDuration] = React.useState<number | undefined>(video?.duration);

  React.useEffect(() => {
    setDuration(video?.duration);
  }, [video?.duration]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const d = e.currentTarget.duration;
    if (isFinite(d) && d > 0 && (!duration || duration === 0)) {
      setDuration(Math.round(d));
    }
  };

  return (
    <div className="group relative">
      <Link href={`/watch/${video?._id}`} className="block">
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
            <video
              src={getMediaUrl(video?.filepath)}
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
              {formatDuration(duration ?? video?.duration)}
            </div>
          </div>
          <div className="flex gap-3">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback>{video?.videochanel?.[0] || "C"}</AvatarFallback>
            </Avatar>
            <div className={`flex-1 min-w-0 ${isOwner ? "pr-6" : ""}`}>
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
                {video?.videotitle}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{video?.videochanel}</p>
              <p className="text-sm text-gray-600">
                {(video?.views || 0).toLocaleString()} views •{" "}
                {video?.createdAt ? formatDistanceToNow(new Date(video.createdAt)) + " ago" : ""}
              </p>
            </div>
          </div>
        </div>
      </Link>

      {isOwner && onDelete && (
        <div className="absolute bottom-2 right-0 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full opacity-80 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Video options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer flex items-center gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(video?._id);
                }}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

