import type { AppErrorPayload } from "@/lib/result";

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly fieldErrors?: Record<string, string[]>;
  public readonly cause?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    opts?: { fieldErrors?: Record<string, string[]>; cause?: unknown },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = opts?.fieldErrors;
    this.cause = opts?.cause;
  }

  toPayload(): AppErrorPayload {
    return {
      code: this.code,
      message: this.message,
      fieldErrors: this.fieldErrors,
    };
  }
}

/** Map an arbitrary thrown value to an AppErrorPayload, safe to return from a server action. */
export function toAppErrorPayload(e: unknown): AppErrorPayload {
  if (e instanceof AppError) return e.toPayload();
  if (e instanceof Error) return { code: "INTERNAL", message: e.message };
  return { code: "INTERNAL", message: "Unexpected error" };
}
