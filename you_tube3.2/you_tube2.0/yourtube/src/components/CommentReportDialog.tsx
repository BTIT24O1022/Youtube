import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

const REASONS = ["Spam", "Misleading content", "Harassment", "Copyright", "Violent content", "Other"];

const CommentReportDialog = ({ commentId, open, onClose }: { commentId: string; open: boolean; onClose: () => void }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axiosInstance.post("/report", { commentId, reason });
      toast.success("Thanks — this comment has been reported for review.");
      onClose();
    } catch (error) {
      toast.error("Couldn't submit the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report comment</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="radio" name="commentreason" checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommentReportDialog;
