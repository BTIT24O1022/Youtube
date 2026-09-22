// One shared list used by both the upload form (VideoUploader) and the
// homepage filter (CategoryTabs), so we never end up with a video saved
// under a category name the filter tabs don't know about, or vice versa.
export const VIDEO_CATEGORIES = [
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
  "Other",
];
