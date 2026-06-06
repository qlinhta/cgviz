import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ---------------------------------------------------------------------------
// General-purpose utilities
// ---------------------------------------------------------------------------

/**
 * Merge Tailwind CSS classes with proper precedence.
 * Combines clsx (conditional class joining) with tailwind-merge
 * (deduplication of conflicting Tailwind utilities).
 *
 * @example
 *   cn('px-4 py-2', isActive && 'bg-accent', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number in compact notation (1.2k, 3.4M, etc.).
 * Falls back to plain string for numbers < 1000.
 *
 * @example
 *   formatNumber(1234)    // "1.2k"
 *   formatNumber(5678900) // "5.7M"
 *   formatNumber(42)      // "42"
 */
export function formatNumber(n: number): string {
  if (Math.abs(n) < 1000) {
    return String(n);
  }

  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  });

  return formatter.format(n);
}

/**
 * Truncate a string to `max` characters, appending an ellipsis if truncated.
 * Returns the original string unchanged if it fits within the limit.
 *
 * @example
 *   truncate('Hello World', 5) // "Hello..."
 *   truncate('Hi', 10)         // "Hi"
 */
export function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return s.slice(0, max) + '…'; // unicode ellipsis
}
