import type { AppErrorPayload } from "@/lib/result";
import { logger } from "@/lib/logger";

/**
 * Generic message returned to clients when an unexpected error escapes a
 * server action. Real error details stay in server logs.
 */
const GENERIC_INTERNAL_MESSAGE = "Something went wrong. Please try again.";

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

/** Map an arbitrary thrown value to an AppErrorPayload, safe to return from a server action.
 *
 * AppError messages are author-controlled and safe to surface. Anything else
 * (Prisma / Supabase / unknown throws) is replaced with a generic message; the
 * real error is recorded on the server via the logger so operators can debug
 * without leaking internals to the client.
 */
export function toAppErrorPayload(e: unknown): AppErrorPayload {
  if (e instanceof AppError) return e.toPayload();
  logger.error({ err: e }, "action.unexpected_error");
  return { code: "INTERNAL", message: GENERIC_INTERNAL_MESSAGE };
}
