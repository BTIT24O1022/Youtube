"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface DeleteVideoDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  videoTitle?: string;
  isDeleting?: boolean;
}

export default function DeleteVideoDialog({
  open,
  onClose,
  onConfirm,
  videoTitle,
  isDeleting = false,
}: DeleteVideoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && !isDeleting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete video</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {videoTitle ? (
              <span className="block font-medium text-foreground mb-1 truncate">
                &quot;{videoTitle}&quot;
              </span>
            ) : null}
            Are you sure you want to delete this video? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
