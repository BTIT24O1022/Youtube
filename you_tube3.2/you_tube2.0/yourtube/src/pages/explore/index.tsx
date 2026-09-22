import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import { Suspense, useState } from "react";

// Explore is functionally the same browsing experience as Home (all
// public videos, filterable by category) -- it exists as a separate page
// mainly so the sidebar's "Explore" link (which every YouTube-style layout
// has) actually goes somewhere instead of 404ing.
export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <main className="flex-1 p-4">
      <h1 className="text-xl font-semibold mb-4">Explore</h1>
      <CategoryTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <Suspense fallback={<div>Loading videos...</div>}>
        <Videogrid category={activeCategory} />
      </Suspense>
    </main>
  );
}
