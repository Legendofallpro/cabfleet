/**
 * Discriminated union returned by services and server actions.
 * Avoids try/catch noise at every call site and makes failure paths typed.
 */
export type Result<T, E = AppErrorPayload> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type AppErrorPayload = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E = AppErrorPayload>(error: E): Result<never, E> {
  return { ok: false, error };
}
