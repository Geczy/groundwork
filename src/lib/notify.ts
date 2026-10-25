import { toast } from "sonner";

export type ErrorNotification = (message: string) => void;

// The one place that turns a thrown value into something a person can read. It lives here rather
// than inline in runtime.tsx so message normalization has its own test surface.
export const errorMessage = function errorMessage(error: Error): string {
  if (error.message.trim() !== "") {
    return error.message;
  }

  return "Something went wrong. Try again.";
};

export const notifyError = function notifyError(
  error: Error,
  notify: ErrorNotification = toast.error
): void {
  notify(errorMessage(error));
};
