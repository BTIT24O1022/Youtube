"use client";

import { Button } from "@/components/ui/button";
import { VIDEO_CATEGORIES } from "@/lib/categories";

const categories = ["All", ...VIDEO_CATEGORIES];

// This component used to manage its own "which tab is active" state and
// never told anyone about clicks, so tabbing between categories did
// nothing to the video list. Now the parent page owns that state and
// passes it down, so the same value can also be used to filter the
// video grid below.
export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeCategory === category ? "default" : "secondary"}
          className="whitespace-nowrap"
          onClick={() => onCategoryChange(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
