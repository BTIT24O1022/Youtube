import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { formatDistanceToNow } from "date-fns";

const formatSize = (bytes: number) => {
  if (!bytes) return "Unknown size";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
};

const DownloadsPage = () => {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([axiosInstance.get("/download/mine"), axiosInstance.get("/download/quota")])
      .then(([downloadsRes, quotaRes]) => {
        setDownloads(downloadsRes.data);
        setQuota(quotaRes.data);
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [user?._id]);

  if (!user) return <main className="flex-1 p-6">Sign in to view your downloads.</main>;
  if (loading) return <main className="flex-1 p-6">Loading...</main>;

  return (
    <main className="flex-1 p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Downloads</h1>
      {quota && (
        <p className="text-sm text-gray-500 mb-6">
          {quota.plan} plan — {quota.remaining >= 999999 ? "unlimited" : `${quota.remaining} of ${quota.limit}`} downloads remaining today.{" "}
          {quota.limit < 999999 && quota.remaining === 0 && <a href="/plans" className="text-blue-600 underline">Upgrade for more</a>}
        </p>
      )}

      {downloads.length === 0 ? (
        <p className="text-sm text-gray-500">You haven't downloaded any videos yet.</p>
      ) : (
        <div className="space-y-2">
          {downloads.map((d) => (
            <div key={d._id} className="flex items-center justify-between border border-border rounded-lg p-3 text-sm bg-card">
              <div className="min-w-0 flex-1 mr-4">
                {d.video?._id ? (
                  <a href={`/watch/${d.video._id}`} className="font-medium hover:underline truncate block">
                    {d.video?.videotitle || "Untitled video"}
                  </a>
                ) : (
                  <p className="font-medium text-gray-400 truncate">Video removed</p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                  {formatSize(d.fileSize)} • {d.plan} plan • {d.browser} • {formatDistanceToNow(new Date(d.createdAt))} ago
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${d.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default DownloadsPage;
