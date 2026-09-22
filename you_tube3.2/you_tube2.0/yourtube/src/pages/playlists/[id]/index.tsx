import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Videocard from "@/components/videocard";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";

const PlaylistDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(`/playlist/${id}`);
      setPlaylist(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const removeVideo = async (videoId: string) => {
    try {
      await axiosInstance.post(`/playlist/${id}/remove`, { videoId });
      setPlaylist((prev: any) => ({ ...prev, videos: prev.videos.filter((v: any) => v._id !== videoId) }));
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) return <main className="flex-1 p-6">Loading...</main>;
  if (!playlist) return <main className="flex-1 p-6">Playlist not found or private.</main>;

  const isOwner = user && playlist.owner?._id === user._id;

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-semibold mb-1">{playlist.name}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {playlist.isPublic ? "Public" : "Private"} playlist by {playlist.owner?.channelname || playlist.owner?.name}
      </p>
      {playlist.videos.length === 0 ? (
        <p className="text-gray-500">No videos in this playlist yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {playlist.videos.map((video: any) => (
            <div key={video._id} className="space-y-2">
              <Videocard video={video} />
              {isOwner && (
                <Button variant="ghost" size="sm" onClick={() => removeVideo(video._id)}>
                  Remove from playlist
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default PlaylistDetailPage;
