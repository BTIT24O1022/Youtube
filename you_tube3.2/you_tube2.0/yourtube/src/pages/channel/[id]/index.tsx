import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = () => {
    if (!id || typeof id !== "string") return;
    setLoading(true);
    axiosInstance
      .get(`/video/channel/${id}`)
      .then((res) => setVideos(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Error fetching channel videos:", err);
        setVideos([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    if (user && String(user._id) === id) {
      setChannel(user);
    } else {
      axiosInstance
        .get(`/user/${id}`)
        .then((res) => setChannel(res.data))
        .catch(() => setChannel(null));
    }

    fetchVideos();
  }, [id, user]);

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel || user} user={user} />
        <Channeltabs />
        {user?._id === id && (
          <div className="px-4 pb-8">
            <VideoUploader
              channelId={id as string}
              channelName={channel?.channelname || user?.channelname}
              onUploadSuccess={fetchVideos}
            />
          </div>
        )}
        <div className="px-4 pb-8">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading videos...</div>
          ) : (
            <ChannelVideos
              videos={videos}
              isOwner={Boolean(user && String(user._id) === id)}
              onVideoDeleted={(deletedId) =>
                setVideos((prev) => prev.filter((v) => v._id !== deletedId))
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;

