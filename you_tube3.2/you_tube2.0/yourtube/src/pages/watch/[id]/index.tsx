import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [videos, setvideo] = useState<any>(null); // the single video being watched
  const [video, setvide] = useState<any>(null); // the full list (kept for RelatedVideos)
  const [loading, setloading] = useState(true);
  const [theater, setTheater] = useState(false);

  useEffect(() => {
    if (!router.isReady || !id || typeof id !== "string") return;

    let isMounted = true;
    const fetchvideo = async () => {
      setloading(true);
      try {
        const [targetRes, allRes] = await Promise.allSettled([
          axiosInstance.get(`/video/${id}`),
          axiosInstance.get("/video/getall"),
        ]);

        let targetVideo = null;
        let allVideos: any[] = [];

        if (allRes.status === "fulfilled" && Array.isArray(allRes.value.data)) {
          allVideos = allRes.value.data;
        }

        if (targetRes.status === "fulfilled" && targetRes.value.data) {
          targetVideo = targetRes.value.data;
        } else if (allVideos.length > 0) {
          targetVideo = allVideos.find((vid: any) => vid._id === id) || null;
        }

        if (isMounted) {
          setvideo(targetVideo);
          setvide(allVideos);
        }
      } catch (error) {
        console.error("Error loading video details:", error);
      } finally {
        if (isMounted) {
          setloading(false);
        }
      }
    };

    fetchvideo();
    setTheater(false); // reset theater mode when navigating between videos

    return () => {
      isMounted = false;
    };
  }, [router.isReady, id]);

  // Simple "next video" pick: the next-newest video in the same category,
  // falling back to just the next one in the list.
  const nextVideo = useMemo(() => {
    if (!video || !videos) return null;
    const sameCategory = video.filter((v: any) => v._id !== videos._id && v.category === videos.category);
    return sameCategory[0] || video.find((v: any) => v._id !== videos._id) || null;
  }, [video, videos]);

  if (loading) {
    return <div>Loading..</div>;
  }

  if (!videos) {
    return <div>Video not found</div>;
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className={`grid grid-cols-1 gap-6 ${theater ? "" : "lg:grid-cols-3"}`}>
          <div className={`space-y-4 ${theater ? "" : "lg:col-span-2"}`}>
            <Videopplayer
              video={videos}
              nextVideo={nextVideo}
              theater={theater}
              onToggleTheater={() => setTheater((t) => !t)}
            />
            <VideoInfo video={videos} />
            <Comments videoId={id} />
          </div>
          {!theater && (
            <div className="space-y-4">
              <RelatedVideos videos={video} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
