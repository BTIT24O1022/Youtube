import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { VIDEO_CATEGORIES } from "@/lib/categories";
import { getMediaUrl, formatDuration } from "@/lib/utils";

const SearchResult = ({ query }: any) => {
  const [videos, setVideos] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [uploadDate, setUploadDate] = useState("");
  const [sort, setSort] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axiosInstance
      .get("/video/search", {
        params: {
          q: query,
          category: category !== "All" ? category : undefined,
          uploadDate: uploadDate || undefined,
          sort: sort || undefined,
        },
      })
      .then((res) => setVideos(res.data))
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [query, category, uploadDate, sort]);

  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Enter a search term to find videos and channels.</p>
      </div>
    );
  }

  const filterBar = (
    <div className="flex flex-wrap gap-3 mb-6 text-sm">
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-2 py-1">
        <option value="All">All categories</option>
        {VIDEO_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} className="border rounded px-2 py-1">
        <option value="">Any time</option>
        <option value="day">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
        <option value="year">This year</option>
      </select>
      <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded px-2 py-1">
        <option value="">Relevance</option>
        <option value="date">Upload date</option>
        <option value="views">View count</option>
        <option value="likes">Likes</option>
      </select>
    </div>
  );

  if (loading) {
    return (
      <div>
        {filterBar}
        <p className="text-gray-500">Searching...</p>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div>
        {filterBar}
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No results found</h2>
          <p className="text-gray-600">Try different keywords or remove search filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filterBar}
      <div className="space-y-4">
        {videos.map((video: any) => (
          <div key={video._id} className="flex gap-4 group">
            <Link href={`/watch/${video._id}`} className="flex-shrink-0">
              <div className="relative w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={getMediaUrl(video.filepath)}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                />
                {video.duration ? (
                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                ) : null}
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                  {video.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{video.views.toLocaleString()} views</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
              </div>

              <Link
                href={`/channel/${video.uploader}`}
                className="flex items-center gap-2 mb-2 hover:text-blue-600"
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">{video.videochanel[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">{video.videochanel}</span>
              </Link>

              <p className="text-sm text-gray-700 line-clamp-2">
                {video.description || "No description provided."}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-8">
        <p className="text-gray-600">Showing {videos.length} results for "{query}"</p>
      </div>
    </div>
  );
};

export default SearchResult;
