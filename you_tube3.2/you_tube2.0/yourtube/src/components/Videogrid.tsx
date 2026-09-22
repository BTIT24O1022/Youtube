import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

const Videogrid = ({ category = "All" }: { category?: string }) => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  useEffect(() => {
    const fetchvideo = async () => {
      setloading(true);
      try {
        const res = await axiosInstance.get("/video/getall", {
          params: { category },
        });
        setvideo(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.log(error);
        setvideo([]);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [category]);

  // const videos = [
  //   {
  //     _id: "1",
  //     videotitle: "Amazing Nature Documentary",
  //     filename: "nature-doc.mp4",
  //     filetype: "video/mp4",
  //     filepath: "/videos/nature-doc.mp4",
  //     filesize: "500MB",
  //     videochanel: "Nature Channel",
  //     Like: 1250,
  //     views: 45000,
  //     uploader: "nature_lover",
  //     createdAt: new Date().toISOString(),
  //   },
  //   {
  //     _id: "2",
  //     videotitle: "Cooking Tutorial: Perfect Pasta",
  //     filename: "pasta-tutorial.mp4",
  //     filetype: "video/mp4",
  //     filepath: "/videos/pasta-tutorial.mp4",
  //     filesize: "300MB",
  //     videochanel: "Chef's Kitchen",
  //     Like: 890,
  //     views: 23000,
  //     uploader: "chef_master",
  //     createdAt: new Date(Date.now() - 86400000).toISOString(),
  //   },
  // ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        <div className="col-span-full text-center py-12 text-gray-500">Loading...</div>
      ) : !Array.isArray(videos) || videos.length === 0 ? (
        <div className="col-span-full text-center py-12 text-gray-500">No videos available yet.</div>
      ) : (
        (Array.isArray(videos) ? videos : []).map((video: any) => (
          <Videocard key={video._id} video={video} />
        ))
      )}
    </div>
  );
};

export default Videogrid;
