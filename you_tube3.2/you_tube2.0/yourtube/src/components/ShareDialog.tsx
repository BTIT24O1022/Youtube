import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Copy, Check, Twitter, Facebook, Mail, MessageSquare } from "lucide-react";

interface ShareDialogProps {
  videoId: string;
  videoTitle?: string;
  open: boolean;
  onClose: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ videoId, videoTitle = "Check out this video", open, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/watch/${videoId}` : `http://localhost:3000/watch/${videoId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = encodeURIComponent(`Watch "${videoTitle}" on YourTube`);
  const encodedUrl = encodeURIComponent(shareUrl);

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      url: `https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`,
    },
    {
      name: "Twitter / X",
      icon: <Twitter className="w-5 h-5 text-sky-500" />,
      url: `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`,
    },
    {
      name: "Facebook",
      icon: <Facebook className="w-5 h-5 text-blue-600" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "Email",
      icon: <Mail className="w-5 h-5 text-gray-600" />,
      url: `mailto:?subject=${shareText}&body=${encodedUrl}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-around py-4 border-b">
          {shareOptions.map((opt) => (
            <a
              key={opt.name}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full border">{opt.icon}</div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{opt.name}</span>
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Input value={shareUrl} readOnly className="flex-1 text-sm bg-gray-50 dark:bg-gray-900" />
          <Button onClick={handleCopy} className="flex items-center gap-1.5 min-w-[90px]">
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
