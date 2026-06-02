/**
 * REST v1 route-handler wrapper (Phase 7 W4 §4.1).
 *
 * Mirrors `src/lib/actions.ts` `action()` but for HTTP route handlers:
 *
 *   1. Body parsing + size cap (S20)
 *   2. Zod validation (if schema)
 *   3. Authentication via Authorization: Bearer (or anonymous)
 *   4. Permission check (PERMISSIONS.*)
 *   5. Ownership callback (S6) — returns 404, not 403, to avoid info leak
 *   6. Per-actor rate limit (preset configurable per route)
 *   7. Idempotency-Key response cache (24h default, scoped per profile)
 *   8. Body executed inside runWithOrg/runWithoutOrg
 *   9. Result<T>/AppError → JSON + status mapping
 *  10. Unknown errors → 500 with generic message; real error in pino
 *
 * Why not reuse `action()`?
 * -------------------------
 * `action()` is shaped for server-action invocation: it accepts a raw
 * unknown input and returns Result<T, AppErrorPayload>. Route handlers
 * take a `Request` (with headers, query, params) and must return a
 * `Response`. The two surfaces are similar enough to confuse a reader
 * but different enough that a shared implementation hurts both.
 *
 * S22 (terminateDriver forced sign-out) is enforced naturally by the
 * Supabase Auth admin path — `auth.admin.signOut(userId)` revokes all
 * refresh tokens; once the access token expires (1h default) the JWT
 * verification in `requireApiAuth` fails and the driver can't refresh.
 * The terminate admin action that calls signOut is wired in a follow-up.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, toAppErrorPayload } from "@/lib/errors";
import type { AppErrorCode } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { checkLimit, getClientIp, type RateLimitOptions } from "@/lib/rate-limit";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { requireApiAuth } from "@/lib/auth/api";
import type { SessionUser } from "@/lib/auth/session";
import { runWithOrg, runWithoutOrg } from "@/lib/org-context";
import type { Result } from "@/lib/result";

const STATUS_FOR_CODE: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export type ApiHandlerContext<TBody, TParams> = {
  user: SessionUser;
  body: TBody;
  params: TParams;
  req: Request;
  url: URL;
};

export type AnonymousApiContext<TBody, TParams> = Omit<
  ApiHandlerContext<TBody, TParams>,
  "user"
>;

type IdempotencyOptions = {
  /** TTL override (hours). Default env.API_V1_IDEMPOTENCY_TTL_HOURS. */
  ttlHours?: number;
};

type RouteHandlerOptions<TBody, TParams> = {
  /** Zod schema parsed against the JSON body. Omit for read-only endpoints. */
  schema?: z.ZodType<TBody>;
  /** Required permission for authenticated callers. */
  permission?: Permission;
  /** Allow anonymous callers (skip requireApiAuth). Default false. */
  allowAnonymous?: boolean;
  /** Per-actor (or per-IP if anonymous) rate-limit preset. */
  rateLimit?: { key: string; opts: RateLimitOptions };
  /** Per-route body byte cap. Default env.API_V1_MAX_BODY_BYTES_DEFAULT. */
  maxBodyBytes?: number;
  /**
   * S6 ownership callback. Returning false produces a 404 (not 403) so
   * the existence of the resource isn't leaked. Runs AFTER auth +
   * permission, BEFORE the handler body.
   */
  ownership?: (ctx: ApiHandlerContext<TBody, TParams>) => Promise<boolean>;
  /**
   * Enable response cache for the Idempotency-Key header. Required for
   * retry-prone mutations (claim, transition). Reads should never set
   * this.
   */
  idempotency?: IdempotencyOptions;
  /** The route body. Returns a Result<T> or a plain Response. */
  handler: (
    ctx: ApiHandlerContext<TBody, TParams>,
  ) => Promise<Result<unknown> | Response>;
  /** Anonymous variant — only used when allowAnonymous=true. */
  anonymousHandler?: (
    ctx: AnonymousApiContext<TBody, TParams>,
  ) => Promise<Result<unknown> | Response>;
};

// ──────────────────────────────────────────────────────────────────────────
// Idempotency response cache (in-memory).
//
// Production deploy gate: swap to Upstash when the same is done for the
// rate limiter (see §4.4). The cache key is
// `${profileId}:${pathname}:${idempotencyHeader}` so a leaked key from
// one driver can't replay another's request.
// ──────────────────────────────────────────────────────────────────────────
type CachedResponse = {
  body: string;
  status: number;
  contentType: string;
  expiresAt: number;
};
const idempotencyStore = new Map<string, CachedResponse>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of idempotencyStore) {
      if (v.expiresAt <= now) idempotencyStore.delete(k);
    }
  }, 5 * 60_000).unref?.();
}

function makeIdempotencyKey(user: SessionUser, url: URL, header: string) {
  return `${user.profile.id}:${url.pathname}:${header}`;
}

// ──────────────────────────────────────────────────────────────────────────
// JSON helpers
// ──────────────────────────────────────────────────────────────────────────
function jsonResponse(status: number, body: unknown, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, { status, headers: extraHeaders });
}

function errorResponse(code: AppErrorCode, message: string, extras?: object) {
  const status = STATUS_FOR_CODE[code] ?? 500;
  return jsonResponse(status, {
    error: { code, message, ...(extras ?? {}) },
  });
}

async function readBoundedJson<TBody>(
  req: Request,
  maxBytes: number,
  schema: z.ZodType<TBody> | undefined,
): Promise<{ ok: true; body: TBody } | { ok: false; response: NextResponse }> {
  // No body for GET/HEAD/DELETE.
  if (req.method === "GET" || req.method === "HEAD") {
    return { ok: true, body: undefined as TBody };
  }

  const lenHeader = req.headers.get("content-length");
  if (lenHeader !== null) {
    const declared = Number(lenHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return {
        ok: false,
        response: errorResponse("VALIDATION", "Request body too large.", {
          limitBytes: maxBytes,
        }),
      };
    }
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return {
      ok: false,
      response: errorResponse("VALIDATION", "Could not read request body."),
    };
  }

  // Defence in depth: even if content-length lied, enforce the cap on
  // the bytes we actually received.
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return {
      ok: false,
      response: errorResponse("VALIDATION", "Request body too large.", {
        limitBytes: maxBytes,
      }),
    };
  }

  if (!schema) {
    // No schema → ignore body content; pass undefined.
    return { ok: true, body: undefined as TBody };
  }

  let parsed: unknown = null;
  if (raw.length > 0) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        response: errorResponse("VALIDATION", "Body must be valid JSON."),
      };
    }
  }

  const safe = schema.safeParse(parsed);
  if (!safe.success) {
    const fieldErrors = z.flattenError(safe.error).fieldErrors as Record<
      string,
      string[]
    >;
    return {
      ok: false,
      response: jsonResponse(400, {
        error: {
          code: "VALIDATION",
          message: "Invalid input",
          fieldErrors,
        },
      }),
    };
  }

  return { ok: true, body: safe.data as TBody };
}

function isResponse(v: unknown): v is Response {
  return typeof Response !== "undefined" && v instanceof Response;
}

async function dispatchResult(
  outcome: Result<unknown> | Response,
): Promise<NextResponse> {
  if (isResponse(outcome)) {
    // Pass through a custom Response (e.g. 204 No Content).
    const body = await outcome.text();
    return new NextResponse(body, {
      status: outcome.status,
      headers: outcome.headers,
    });
  }
  if (!outcome.ok) {
    const status = STATUS_FOR_CODE[outcome.error.code as AppErrorCode] ?? 500;
    return jsonResponse(status, { error: outcome.error });
  }
  return jsonResponse(200, { data: outcome.data });
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

/** Default route-handler-shape param for Next 15 dynamic routes. */
export type DynamicRouteContext<TParams> = {
  params: Promise<TParams>;
};

/**
 * Build a Next 15 route handler from declarative options.
 *
 * Anonymous example (rare — most v1 endpoints require a JWT):
 *   export const GET = withApiHandler({
 *     allowAnonymous: true,
 *     handler: async () => ok({ status: "up" }),
 *   });
 */
export function withApiHandler<TBody = undefined, TParams = Record<string, string>>(
  opts: RouteHandlerOptions<TBody, TParams>,
) {
  const maxBodyBytes = opts.maxBodyBytes ?? env.API_V1_MAX_BODY_BYTES_DEFAULT;
  const idempotencyTtlMs =
    (opts.idempotency?.ttlHours ?? env.API_V1_IDEMPOTENCY_TTL_HOURS) *
    60 *
    60 *
    1000;

  return async function routeHandler(
    req: Request,
    routeCtx?: DynamicRouteContext<TParams>,
  ): Promise<NextResponse> {
    if (!env.API_V1_ENABLED) {
      // Fail-closed so a half-deployed v1 cannot answer requests in
      // staging/prod accidentally.
      return errorResponse("FORBIDDEN", "API v1 is disabled.");
    }

    const url = new URL(req.url);

    // 1. Body parse + size cap.
    const bodyOutcome = await readBoundedJson<TBody>(
      req,
      maxBodyBytes,
      opts.schema,
    );
    if (!bodyOutcome.ok) return bodyOutcome.response;

    const params = ((await routeCtx?.params) ?? {}) as TParams;

    // 2. Auth (or anonymous).
    let user: SessionUser | null = null;
    if (!opts.allowAnonymous) {
      try {
        user = await requireApiAuth(req);
      } catch (err) {
        const payload = toAppErrorPayload(err);
        return errorResponse(payload.code as AppErrorCode, payload.message);
      }

      // 3. Permission.
      if (opts.permission && !hasPermission(user.profile.role, opts.permission)) {
        logger.warn(
          {
            permission: opts.permission,
            role: user.profile.role,
            profileId: user.profile.id,
          },
          "api.forbidden.missing_permission",
        );
        return errorResponse("FORBIDDEN", "You do not have access to this resource.");
      }
    }

    // 4. Rate limit. Keyed by profile id when authenticated, IP otherwise.
    if (opts.rateLimit) {
      const actor = user ? `profile:${user.profile.id}` : `ip:${getClientIp(req)}`;
      const limit = checkLimit(
        `api.v1:${opts.rateLimit.key}:${actor}`,
        opts.rateLimit.opts,
      );
      if (!limit.success) {
        return new NextResponse(
          JSON.stringify({
            error: {
              code: "RATE_LIMITED",
              message: "You're doing that too often. Please slow down.",
            },
          }),
          {
            status: 429,
            headers: {
              "content-type": "application/json",
              "Retry-After": Math.max(
                1,
                Math.ceil((limit.resetAt - Date.now()) / 1000),
              ).toString(),
            },
          },
        );
      }
    }

    // 5. Idempotency-Key cache lookup BEFORE handler runs.
    const idempotencyHeader =
      opts.idempotency && user
        ? (req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key"))
        : null;
    let idempotencyKey: string | null = null;
    if (idempotencyHeader && user) {
      // Defensive header validation — anything beyond a stable opaque token
      // is rejected, both to make collisions less likely and to make the
      // store-bound nature explicit to clients.
      if (idempotencyHeader.length > 128 || !/^[A-Za-z0-9_\-.:]+$/.test(idempotencyHeader)) {
        return errorResponse(
          "VALIDATION",
          "Idempotency-Key must be ≤128 chars, alphanumerics + - _ . :",
        );
      }
      idempotencyKey = makeIdempotencyKey(user, url, idempotencyHeader);
      const cached = idempotencyStore.get(idempotencyKey);
      if (cached && cached.expiresAt > Date.now()) {
        return new NextResponse(cached.body, {
          status: cached.status,
          headers: {
            "content-type": cached.contentType,
            "idempotent-replay": "true",
          },
        });
      }
    }

    // 6. Build context for the handler.
    const ctx = {
      user: user as SessionUser,
      body: bodyOutcome.body,
      params,
      req,
      url,
    } as ApiHandlerContext<TBody, TParams>;

    // 7. Ownership check (S6) — 404, not 403.
    if (user && opts.ownership) {
      try {
        const allowed = await opts.ownership(ctx);
        if (!allowed) {
          return errorResponse("NOT_FOUND", "Resource not found.");
        }
      } catch (err) {
        const payload = toAppErrorPayload(err);
        return errorResponse(
          payload.code as AppErrorCode,
          payload.message,
          payload.fieldErrors ? { fieldErrors: payload.fieldErrors } : undefined,
        );
      }
    }

    // 8. Run inside org context. Wrap in try/catch so unknown throws are
    //    mapped to a generic 500 without leaking internals.
    const invoke = async () => {
      try {
        if (user) {
          return await opts.handler(ctx);
        }
        if (!opts.anonymousHandler) {
          return errorResponse(
            "INTERNAL",
            "anonymousHandler missing for allowAnonymous=true route.",
          );
        }
        // anonymousHandler receives no user — narrow the type accordingly.
        return await opts.anonymousHandler(ctx as AnonymousApiContext<TBody, TParams>);
      } catch (err) {
        if (!(err instanceof AppError)) {
          logger.error({ err, path: url.pathname }, "api.unhandled_error");
        }
        const payload = toAppErrorPayload(err);
        return errorResponse(
          payload.code as AppErrorCode,
          payload.message,
          payload.fieldErrors ? { fieldErrors: payload.fieldErrors } : undefined,
        );
      }
    };

    let response: NextResponse;
    if (user) {
      const orgId = user.profile.orgId;
      if (orgId) {
        response = await runWithOrg(orgId, async () => dispatchResult(await invoke()));
      } else {
        // SUPER_ADMIN — no tenant filter.
        response = await runWithoutOrg(`api.v1:${url.pathname}:super_admin`, async () =>
          dispatchResult(await invoke()),
        );
      }
    } else {
      response = await dispatchResult(await invoke());
    }

    // 9. Cache successful responses for the idempotency window. Errors are
    //    intentionally NOT cached — a 429 today shouldn't bind the client to
    //    a 429 for 24h.
    if (idempotencyKey && response.status >= 200 && response.status < 300) {
      const text = await response.clone().text();
      idempotencyStore.set(idempotencyKey, {
        body: text,
        status: response.status,
        contentType: response.headers.get("content-type") ?? "application/json",
        expiresAt: Date.now() + idempotencyTtlMs,
      });
    }

    return response;
  };
}

// Exposed for tests — DO NOT use from app code. Mutating this from the
// product code would break the abstraction.
export const __internalIdempotencyStoreForTests = idempotencyStore;
