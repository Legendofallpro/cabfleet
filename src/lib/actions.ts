import { z } from "zod";
import { AppError, toAppErrorPayload } from "@/lib/errors";
import { err, type AppErrorPayload, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";

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
