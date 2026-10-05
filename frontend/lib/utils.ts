import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}m ${secs}s`;
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? String(dateString)
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

export function getConfidenceColor(score: number): string {
  if (score >= 80) return 'text-green-500 bg-green-50 dark:bg-green-950/50';
  if (score >= 50) return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/50';
  return 'text-red-500 bg-red-50 dark:bg-red-950/50';
}