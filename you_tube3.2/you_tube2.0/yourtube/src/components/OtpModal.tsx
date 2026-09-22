import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useUser } from "@/lib/AuthContext";

// Rendered once at the app root (see _app.tsx). It's invisible unless
// AuthContext has an active otpChallenge -- i.e. the backend just told us
// this browser/device/location isn't recognized yet.
const OtpModal = () => {
  const { otpChallenge, verifyOtp, cancelOtp } = useUser();
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!otpChallenge) return null;

  const handleVerify = async () => {
    if (!code.trim()) return;
    setVerifying(true);
    setError("");
    const result = await verifyOtp(code.trim(), trustDevice);
    setVerifying(false);
    if (!result.success) {
      setError(result.message || "Verification failed");
      setCode("");
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && cancelOtp()}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Verify it's you</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {otpChallenge.message || "We don't recognize this browser or location. Enter the code we sent to your email."}
          </p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            className="text-center text-lg tracking-widest"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} />
            Trust this browser for 30 days
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={cancelOtp}>Cancel</Button>
          <Button onClick={handleVerify} disabled={code.length !== 6 || verifying}>
            {verifying ? "Verifying..." : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OtpModal;
