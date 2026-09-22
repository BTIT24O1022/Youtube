import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_LABEL: any = {
  trusted: "Trusted device",
  otp_pending: "Verification sent",
  otp_verified: "Verified",
  otp_failed: "Verification failed",
};

const SecurityPage = () => {
  const { user } = useUser();
  const [history, setHistory] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"history" | "devices">("history");

  const load = async () => {
    try {
      const [historyRes, devicesRes] = await Promise.all([
        axiosInstance.get("/security/login-history"),
        axiosInstance.get("/security/trusted-devices"),
      ]);
      setHistory(historyRes.data);
      setDevices(devicesRes.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user?._id]);

  const revoke = async (id: string) => {
    if (!confirm("Revoke trust for this device? It will need to verify with a code again next time.")) return;
    try {
      await axiosInstance.delete(`/security/trusted-devices/${id}`);
      setDevices((prev) => prev.filter((d) => d._id !== id));
      toast.success("Device trust revoked");
    } catch (error) {
      toast.error("Couldn't revoke this device");
    }
  };

  if (!user) return <main className="flex-1 p-6">Sign in to view your account security.</main>;
  if (loading) return <main className="flex-1 p-6">Loading...</main>;

  const location = (r: any) => [r.city, r.state, r.country].filter(Boolean).join(", ") || "Unknown location";

  return (
    <main className="flex-1 p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Account Security</h1>
      <p className="text-sm text-gray-500 mb-6">
        Review where you've signed in from, and which browsers are trusted to skip the verification code.
      </p>

      <div className="flex gap-2 border-b mb-6">
        <button className={`px-3 py-2 text-sm ${tab === "history" ? "border-b-2 border-black font-medium" : "text-gray-500"}`} onClick={() => setTab("history")}>
          Login History
        </button>
        <button className={`px-3 py-2 text-sm ${tab === "devices" ? "border-b-2 border-black font-medium" : "text-gray-500"}`} onClick={() => setTab("devices")}>
          Trusted Devices
        </button>
      </div>

      {tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No login history yet.</p>
          ) : (
            history.map((r) => (
              <div key={r._id} className="border rounded-lg p-3 text-sm flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {r.browser} on {r.os} ({r.deviceType}{r.deviceModel ? ` · ${r.deviceModel}` : ""})
                  </p>
                  <p className="text-gray-500 text-xs">
                    {location(r)} • {r.ip || "unknown IP"} • {formatDistanceToNow(new Date(r.createdAt))} ago
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    r.status === "otp_failed" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "devices" && (
        <div className="space-y-2">
          {devices.length === 0 ? (
            <p className="text-sm text-gray-500">No trusted devices yet — every login currently requires a code.</p>
          ) : (
            devices.map((d) => (
              <div key={d._id} className="border rounded-lg p-3 text-sm flex justify-between items-center">
                <div>
                  <p className="font-medium">{d.browser || "Unknown browser"}</p>
                  <p className="text-gray-500 text-xs">
                    {[d.city, d.state, d.country].filter(Boolean).join(", ") || "Unknown location"} • Trusted until{" "}
                    {new Date(d.trustedUntil).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revoke(d._id)}>Revoke</Button>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
};

export default SecurityPage;
