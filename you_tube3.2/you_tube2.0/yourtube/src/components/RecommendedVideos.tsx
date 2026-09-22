import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const RecommendedVideos = () => {
  const { user } = useUser();
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    if (!user?._id) return;
    axiosInstance
      .get(`/video/recommendations/${user._id}`)
      .then((res) => setVideos(res.data))
      .catch((err) => console.log(err));
  }, [user?._id]);

  if (!user || videos.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Recommended for you</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.slice(0, 8).map((video: any) => (
          <Videocard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
};

export default RecommendedVideos;
