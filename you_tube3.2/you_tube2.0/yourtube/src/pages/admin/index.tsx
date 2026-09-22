import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const StatCard = ({ label, value }: { label: string; value: number | string }) => (
  <div className="border rounded-lg p-4">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);

const AdminPage = () => {
  const { user } = useUser();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [tab, setTab] = useState<"users" | "reports">("users");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = async () => {
    try {
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        axiosInstance.get("/admin/stats"),
        axiosInstance.get("/admin/users"),
        axiosInstance.get("/admin/reports"),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setReports(reportsRes.data);
    } catch (error: any) {
      if (error?.response?.status === 403) setForbidden(true);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user?._id]);

  const toggleBlock = async (id: string) => {
    try {
      const res = await axiosInstance.patch(`/admin/users/${id}/block`);
      setUsers((prev) => prev.map((u) => (u._id === id ? res.data : u)));
    } catch (error) {
      toast.error("Couldn't update user");
    }
  };

  const updateReport = async (id: string, status: string) => {
    try {
      const res = await axiosInstance.patch(`/admin/reports/${id}`, { status });
      setReports((prev) => prev.map((r) => (r._id === id ? res.data : r)));
    } catch (error) {
      toast.error("Couldn't update report");
    }
  };

  if (!user) return <main className="flex-1 p-6">Sign in required.</main>;
  if (forbidden) return <main className="flex-1 p-6">You don't have admin access.</main>;
  if (loading) return <main className="flex-1 p-6">Loading admin dashboard...</main>;

  return (
    <main className="flex-1 p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
        <StatCard label="Total Videos" value={stats?.totalVideos ?? 0} />
        <StatCard label="Total Comments" value={stats?.totalComments ?? 0} />
        <StatCard label="Pending Reports" value={stats?.totalReports ?? 0} />
      </div>

      <div className="flex gap-2 border-b">
        <button
          className={`px-3 py-2 text-sm ${tab === "users" ? "border-b-2 border-black font-medium" : "text-gray-500"}`}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          className={`px-3 py-2 text-sm ${tab === "reports" ? "border-b-2 border-black font-medium" : "text-gray-500"}`}
          onClick={() => setTab("reports")}
        >
          Reports
        </button>
      </div>

      {tab === "users" && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u._id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">{u.name || u.channelname || u.email}</p>
                <p className="text-xs text-gray-500">{u.email} • {u.role}</p>
              </div>
              <Button
                variant={u.blocked ? "outline" : "ghost"}
                size="sm"
                onClick={() => toggleBlock(u._id)}
              >
                {u.blocked ? "Unblock" : "Block"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-2">
          {reports.length === 0 && <p className="text-gray-500">No reports.</p>}
          {reports.map((r) => (
            <div key={r._id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">{r.videoid?.videotitle || "Video removed"}</p>
                <p className="text-xs text-gray-500">
                  Reason: {r.reason} • Reported by {r.reporter?.name || r.reporter?.email} • {r.status}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => updateReport(r._id, "reviewed")}>Mark reviewed</Button>
                <Button variant="ghost" size="sm" onClick={() => updateReport(r._id, "dismissed")}>Dismiss</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default AdminPage;
