import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Join class names, resolving Tailwind conflicts (last one wins). */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
