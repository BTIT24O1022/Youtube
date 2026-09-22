import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import VideoEditDialog from "@/components/VideoEditDialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const StatCard = ({ label, value }: { label: string; value: number | string }) => (
  <div className="border rounded-lg p-4">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);

const DashboardPage = () => {
  const { user } = useUser();
  const [stats, setStats] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?._id) return;
    try {
      const [statsRes, videosRes] = await Promise.all([
        axiosInstance.get(`/video/channel/${user._id}/stats`),
        axiosInstance.get(`/video/channel/${user._id}`),
      ]);
      setStats(statsRes.data);
      setVideos(videosRes.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?._id]);

  const deleteVideo = async (id: string) => {
    if (!confirm("Delete this video? This can't be undone.")) return;
    try {
      await axiosInstance.delete(`/video/${id}`);
      setVideos((prev) => prev.filter((v) => v._id !== id));
      toast.success("Video deleted");
    } catch (error) {
      toast.error("Couldn't delete video");
    }
  };

  if (!user) return <main className="flex-1 p-6">Sign in to view your Creator Studio.</main>;
  if (!user.channelname) return <main className="flex-1 p-6">Create a channel first to access Creator Studio.</main>;
  if (loading) return <main className="flex-1 p-6">Loading dashboard...</main>;

  return (
    <main className="flex-1 p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Creator Studio — {user.channelname}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Videos" value={stats?.totalVideos ?? 0} />
        <StatCard label="Total Views" value={(stats?.totalViews ?? 0).toLocaleString()} />
        <StatCard label="Total Likes" value={(stats?.totalLikes ?? 0).toLocaleString()} />
        <StatCard label="Subscribers" value={(stats?.subscriberCount ?? 0).toLocaleString()} />
      </div>

      {stats?.topVideos?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Top Performing Videos</h2>
          <div className="space-y-2">
            {stats.topVideos.map((v: any) => (
              <div key={v._id} className="flex justify-between text-sm border-b py-2">
                <span className="truncate max-w-md">{v.videotitle}</span>
                <span className="text-gray-500">{v.views.toLocaleString()} views</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Manage Videos</h2>
        <div className="space-y-2">
          {videos.map((v) => (
            <div key={v._id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{v.videotitle}</p>
                <p className="text-xs text-gray-500">
                  {v.views.toLocaleString()} views • {v.visibility} • {v.category} •{" "}
                  {formatDistanceToNow(new Date(v.createdAt))} ago
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => setEditing(v)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => deleteVideo(v._id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <VideoEditDialog
          video={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          onSaved={(updated: any) => setVideos((prev) => prev.map((v) => (v._id === updated._id ? updated : v)))}
        />
      )}
    </main>
  );
};

export default DashboardPage;
