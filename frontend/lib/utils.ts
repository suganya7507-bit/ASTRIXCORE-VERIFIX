import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind CSS class names cleanly avoiding conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string or Date object into a readable string (e.g. "Oct 5, 2026")
 */
export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats seconds or milliseconds into readable duration string (e.g., "2m 15s" or "120ms")
 */
export function formatDuration(secondsOrMs: number | string | undefined | null): string {
  if (secondsOrMs === undefined || secondsOrMs === null) return "0s";
  const num = typeof secondsOrMs === "string" ? parseFloat(secondsOrMs) : secondsOrMs;
  if (isNaN(num)) return "0s";

  if (num < 1 && num > 0) {
    return `${Math.round(num * 1000)}ms`;
  }
  
  const mins = Math.floor(num / 60);
  const secs = Math.floor(num % 60);
  
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Returns Tailwind text color class based on confidence or coverage score percentage
 */
export function getConfidenceColor(score: number | undefined | null): string {
  if (score === undefined || score === null) return "text-gray-500";
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}