import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = function cn(...inputs: Array<ClassValue>): string {
  return twMerge(clsx(inputs));
};
