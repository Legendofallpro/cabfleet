import { z } from "zod";
import { AppError, toAppErrorPayload } from "@/lib/errors";
import { err, type AppErrorPayload, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { checkLimit, LIMITS } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Wraps a server-action body so it:
 *  - validates `input` against a zod schema
 *  - catches AppError + unknown errors and converts to Result<E>
 *  - logs failures with the action name
 *
 * Usage:
 *   export const createVehicle = action(
 *     "vehicles.create",
 *     createVehicleSchema,
 *     async (input) => { ... return ok(vehicle); }
 *   );
 */
export function action<Schema extends z.ZodTypeAny, T>(
  name: string,
  schema: Schema,
  fn: (input: z.infer<Schema>) => Promise<Result<T>>,
) {
  return async (raw: unknown): Promise<Result<T, AppErrorPayload>> => {
    // Per-actor rate limit. Falls back to "anon" when no session (covers
    // public actions). Limits are per-action-name + actor to avoid one
    // hot action starving the others.
    try {
      const session = await getSessionUser();
      const actorKey = session?.profile.id ?? "anon";
      const limit = checkLimit(`action:${name}:${actorKey}`, LIMITS.action);
      if (!limit.success) {
        logger.warn(
          { action: name, actorKey, resetAt: limit.resetAt },
          "action.rate_limited",
        );
        return err({
          code: "RATE_LIMITED",
          message: "You're doing that too often. Please slow down.",
        });
      }
    } catch (limitErr) {
      // Never let the limiter itself block legitimate traffic.
      logger.error({ err: limitErr }, "rate_limit.check_failed");
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >;
      return err({
        code: "VALIDATION",
        message: "Invalid input",
        fieldErrors,
      });
    }

    try {
      return await fn(parsed.data);
    } catch (e) {
      if (!(e instanceof AppError)) {
        logger.error({ action: name, err: e }, "Unhandled action error");
      } else if (e.code === "INTERNAL") {
        logger.error({ action: name, err: e }, e.message);
      }
      return err(toAppErrorPayload(e));
    }
  };
}
