"use client";

import React, { useState } from "react";
import VideoCard from "./videocard";
import DeleteVideoDialog from "./DeleteVideoDialog";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface ChannelVideosProps {
  videos: any[];
  isOwner?: boolean;
  onVideoDeleted?: (deletedId: string) => void;
}

export default function ChannelVideos({
  videos,
  isOwner = false,
  onVideoDeleted,
}: ChannelVideosProps) {
  const [videoToDelete, setVideoToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No videos uploaded yet.</p>
      </div>
    );
  }

  const handleDeleteConfirm = async () => {
    if (!videoToDelete?._id) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/video/${videoToDelete._id}`);
      toast.success("Video deleted successfully");
      onVideoDeleted?.(videoToDelete._id);
      setVideoToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete video:", error);
      toast.error(error?.response?.data?.message || "Failed to delete video");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Videos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video: any) => (
          <VideoCard
            key={video._id}
            video={video}
            isOwner={isOwner}
            onDelete={() => setVideoToDelete(video)}
          />
        ))}
      </div>

      <DeleteVideoDialog
        open={!!videoToDelete}
        onClose={() => setVideoToDelete(null)}
        onConfirm={handleDeleteConfirm}
        videoTitle={videoToDelete?.videotitle}
        isDeleting={isDeleting}
      />
    </div>
  );
}

