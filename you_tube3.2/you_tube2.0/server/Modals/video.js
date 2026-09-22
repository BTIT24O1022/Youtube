import mongoose from "mongoose";
const videochema = mongoose.Schema(
  {
    videotitle: { type: String, required: true },
    filename: { type: String, required: true },
    filetype: { type: String, required: true },
    filepath: { type: String, required: true },
    filesize: { type: String, required: true },
    duration: { type: Number, default: 0 },
    videochanel: { type: String, required: true },
    description: { type: String, default: "" },
    tags: [{ type: String }],
    visibility: { type: String, enum: ["public", "private", "unlisted"], default: "public" },
    category: {
      type: String,
      enum: [
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
      ],
      default: "Other",
    },
    Like: { type: Number, default: 0 },
    Dislike: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    uploader: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("videofiles", videochema);
