import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import Videocard from "@/components/videocard";

export default function SubscriptionsPage() {
  const { user } = useUser();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    const load = async () => {
      try {
        // Find who the user is subscribed to, then pull each of those
        // channels' videos and combine them, newest first -- a simple
        // version of a subscriptions feed.
        const subsRes = await axiosInstance.get(`/subscription/mine/${user._id}`);
        const channelIds: string[] = subsRes.data.map((s: any) => s.channel?._id).filter(Boolean);

        if (channelIds.length === 0) {
          setVideos([]);
          return;
        }

        const videoLists = await Promise.all(
          channelIds.map((id) => axiosInstance.get(`/video/channel/${id}`).then((r) => r.data))
        );
        const combined = videoLists.flat().sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));
        setVideos(combined);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?._id]);

  if (!user) return <main className="flex-1 p-6">Sign in to see videos from channels you subscribe to.</main>;
  if (loading) return <main className="flex-1 p-6">Loading...</main>;

  return (
    <main className="flex-1 p-4">
      <h1 className="text-xl font-semibold mb-4">Subscriptions</h1>
      {videos.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You haven't subscribed to any channels yet — videos from channels you follow will show up here.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((v) => (
            <Videocard key={v._id} video={v} />
          ))}
        </div>
      )}
    </main>
  );
}
