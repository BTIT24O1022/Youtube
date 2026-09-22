import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share as ShareIcon,
  ThumbsDown,
  ThumbsUp,
  Flag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import SubscribeButton from "./SubscribeButton";
import AddToPlaylistMenu from "./AddToPlaylistMenu";
import ReportDialog from "./ReportDialog";
import ShareDialog from "./ShareDialog";
import { getMediaUrl } from "@/lib/utils";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { user, handlegooglesignin } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
    setIsWatchLater(false);

    if (user && video?._id) {
      axiosInstance
        .get(`/video/status/${video._id}`)
        .then((res) => {
          setIsLiked(res.data.liked);
          setIsDisliked(res.data.disliked);
          setIsWatchLater(res.data.watchLater);
        })
        .catch(() => {});
    }
  }, [video, user?._id]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user, video?._id]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      setlikes(res.data.likeCount);
      setDislikes(res.data.dislikeCount);
      setIsLiked(res.data.liked);
      if (res.data.liked) setIsDisliked(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(true);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      handlegooglesignin();
      return;
    }
    setDownloading(true);
    try {
      const res = await axiosInstance.post(`/download/request/${video._id}`);
      const downloadPath = res.data.downloadUrl;
      const fullUrl = getMediaUrl(downloadPath);

      try {
        const fileRes = await fetch(fullUrl);
        if (!fileRes.ok) throw new Error("Could not fetch video file");
        const blob = await fileRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.data.filename || `${video.videotitle || "video"}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (blobErr) {
        // Direct download fallback
        const fallbackUrl = `${(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}/download/file/${video._id}`;
        const a = document.createElement("a");
        a.href = fallbackUrl;
        a.setAttribute("download", res.data.filename || `${video.videotitle || "video"}.mp4`);
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || "Couldn't start the download.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/dislike/${video._id}`, {
        userId: user?._id,
      });
      setlikes(res.data.likeCount);
      setDislikes(res.data.dislikeCount);
      setIsDisliked(res.data.disliked);
      if (res.data.disliked) setIsLiked(false);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel?.[0] || "C"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
          </div>
          {(() => {
            const rawId = typeof video?.uploader === "object" ? video.uploader?._id : video?.uploader;
            const creatorId = typeof rawId === "string" && /^[0-9a-fA-F]{24}$/.test(rawId) ? rawId : undefined;
            return <SubscribeButton channelId={creatorId} showCount />;
          })()}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full">
            <Button variant="ghost" size="sm" className="rounded-l-full" onClick={handleLike}>
              <ThumbsUp className={`w-5 h-5 mr-2 ${isLiked ? "fill-current text-blue-600 dark:text-blue-400" : ""}`} />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
            <Button variant="ghost" size="sm" className="rounded-r-full" onClick={handleDislike}>
              <ThumbsDown className={`w-5 h-5 mr-2 ${isDisliked ? "fill-current text-blue-600 dark:text-blue-400" : ""}`} />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 dark:bg-gray-800 rounded-full ${isWatchLater ? "text-blue-600 font-semibold" : ""}`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <AddToPlaylistMenu videoId={video._id} />
          <Button variant="ghost" size="sm" className="bg-gray-100 dark:bg-gray-800 rounded-full" onClick={handleDownload} disabled={downloading}>
            <Download className="w-5 h-5 mr-2" />
            {downloading ? "Preparing..." : "Download"}
          </Button>
          <Button variant="ghost" size="sm" className="bg-gray-100 dark:bg-gray-800 rounded-full" onClick={() => setShareOpen(true)}>
            <ShareIcon className="w-5 h-5 mr-2" />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="bg-gray-100 dark:bg-gray-800 rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Flag className="w-4 h-4 mr-2" /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800/60 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{(video.views || 0).toLocaleString()} views</span>
          <span>{video.createdAt ? formatDistanceToNow(new Date(video.createdAt)) + " ago" : ""}</span>
          {video.category && <span className="text-gray-500">#{video.category}</span>}
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>{video.description || "No description provided."}</p>
          {video.tags?.length > 0 && (
            <p className="mt-2 text-blue-600">{video.tags.map((t: string) => `#${t}`).join(" ")}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
      <ReportDialog videoId={video._id} open={reportOpen} onClose={() => setReportOpen(false)} />
      <ShareDialog videoId={video._id} videoTitle={video.videotitle} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
};

export default VideoInfo;

