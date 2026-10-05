import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getConfidenceColor(confidence?: number | null): string {
  if (confidence === undefined || confidence === null) return "text-gray-500";
  if (confidence >= 80) return "text-green-600";
  if (confidence >= 50) return "text-yellow-600";
  return "text-red-600";
}