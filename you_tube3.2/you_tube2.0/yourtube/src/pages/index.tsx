import CategoryTabs from "@/components/category-tabs";
import ContinueWatching from "@/components/ContinueWatching";
import RecommendedVideos from "@/components/RecommendedVideos";
import Videogrid from "@/components/Videogrid";
import { Suspense, useState } from "react";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <main className="flex-1 p-4">
      <ContinueWatching />
      <RecommendedVideos />
      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <Suspense fallback={<div>Loading videos...</div>}>
        <Videogrid category={activeCategory} />
      </Suspense>
    </main>
  );
}
