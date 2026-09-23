import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "https://youtube-backend-n2km.onrender.com";
}

export function getMediaUrl(filepath?: string): string {
  if (!filepath) return "";
  const clean = filepath.replace(/\\/g, "/");
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  const baseUrl = getBackendUrl().replace(/\/$/, "");
  const path = clean.startsWith("/") ? clean : `/${clean}`;
  return `${baseUrl}${path}`;
}

export function formatDuration(seconds?: number | string | null): string {
  if (
    seconds === undefined ||
    seconds === null ||
    seconds === "" ||
    Number.isNaN(Number(seconds))
  ) {
    return "--:--";
  }
  const totalSeconds = Math.floor(Number(seconds));
  if (totalSeconds <= 0) {
    return "--:--";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const paddedSeconds = String(remainingSeconds).padStart(2, "0");

  if (hours > 0) {
    const paddedMinutes = String(minutes).padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}


