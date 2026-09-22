import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getMediaUrl } from "@/lib/utils";

const ContinueWatching = () => {
  const { user } = useUser();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user?._id) return;
    axiosInstance
      .get(`/history/${user._id}`)
      .then((res) => {
        // Only show videos that were left part-way through, not ones
        // barely started or already finished.
        const inProgress = res.data.filter(
          (h: any) => h.videoid && h.duration > 0 && h.progress > 15 && h.progress < h.duration * 0.95
        );
        setItems(inProgress.slice(0, 6));
      })
      .catch((err) => console.log(err));
  }, [user?._id]);

  if (!user || items.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Continue Watching</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {items.map((h) => (
          <Link key={h._id} href={`/watch/${h.videoid._id}`} className="group">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <video
                src={getMediaUrl(h.videoid.filepath)}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                <div
                  className="h-full bg-red-600"
                  style={{ width: `${Math.min(100, (h.progress / h.duration) * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-sm font-medium mt-1 line-clamp-2 group-hover:text-blue-600">
              {h.videoid.videotitle}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ContinueWatching;
