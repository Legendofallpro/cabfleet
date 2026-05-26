# Supabase Email Template Contract

This document is the **required configuration reference** for Supabase email templates in CabFleet. Every invite and recovery link **must** point to the app's `/auth/callback` route using `token_hash` + `type` parameters. PKCE `code` exchange is kept only as a backward-compatibility fallback and should not appear in new templates.

## Why `token_hash` links, not magic `{{ .ConfirmationURL }}`

The default Supabase magic-link template uses `{{ .ConfirmationURL }}`, which is a PKCE code link. PKCE requires the verification to happen in the **same browser session** that initiated the request. This breaks the common case where:

- An admin invites a driver and the driver opens the email on a different device or browser.
- A user requests a password reset on their phone and clicks the link on their desktop.

`token_hash` verification happens fully server-side in `/auth/callback`, so it works across devices and browsers.

## Required templates

### Password recovery

Navigate to: **Supabase Dashboard → Authentication → Email Templates → Reset Password**

```html
<h2>Reset Your Password</h2>
<p>
  Click the link below to reset your CabFleet password.
  This link expires in 1 hour.
</p>
<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}">
    Reset password
  </a>
</p>
<p>If you did not request a password reset, you can safely ignore this email.</p>
```

### User invite

Navigate to: **Supabase Dashboard → Authentication → Email Templates → Invite User**

```html
<h2>You've Been Invited to CabFleet</h2>
<p>
  An administrator has invited you to join CabFleet.
  Click the link below to set your password and activate your account.
  This link expires in 24 hours.
</p>
<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&redirect_to={{ .RedirectTo }}">
    Accept invite
  </a>
</p>
```

## Template variables

| Variable | Source | Notes |
|---|---|---|
| `{{ .SiteURL }}` | Supabase project → Authentication → URL Configuration → Site URL | Must be set to the production app URL. For local dev, use `http://localhost:3000`. |
| `{{ .TokenHash }}` | Supabase-generated per email send | URL-safe; no encoding needed. |
| `{{ .RedirectTo }}` | Passed by the app when triggering the email | Pre-encoded by CabFleet server code; no additional encoding needed in the template. |
| `type` | Literal string in the template | Must be `recovery` or `invite` to match Supabase OTP types. |

> **Note on `urlquery`**: Supabase email templates use Go's `html/template` engine. The `urlquery` filter exists but its availability may vary across Supabase versions. CabFleet passes a pre-encoded `redirect_to` value from the server, so no template-side URL encoding is needed. Do not add `| urlquery` to `{{ .RedirectTo }}` unless you have verified it is supported and the value is not already encoded.

## How the callback route uses these parameters

```
GET /auth/callback?token_hash=<hash>&type=recovery&redirect_to=/portal/book
```

1. `token_hash` + `type` → `supabase.auth.verifyOtp(...)` (server-side, cross-browser safe)
2. On success for `invite` or `recovery` type:
   - A signed, short-lived (`cabfleet-password-setup-proof`) cookie is issued.
   - The `redirect_to` value is embedded in the proof payload as the post-password destination.
   - The browser is redirected to `/set-password?mode=<flow>`.
3. On failure: browser is redirected to `/set-password` (no `?mode=`) which renders the invalid-link UX.
4. If auth verification succeeds but the app `Profile` row is missing: browser is redirected to `/auth-error?reason=provisioning`.

## `redirect_to` override in invite/admin flows

When the app creates a Supabase invite (`supabase.auth.admin.inviteUserByEmail`), pass `redirect_to` explicitly to control where the user lands after setting their password:

```ts
await supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect_to=/driver`,
});
```

CabFleet's current driver and staff invite services already do this. The value ends up embedded in `{{ .RedirectTo }}` in the Supabase template.

## Local development

For local development, set **Site URL** and **Redirect URLs** in Supabase Dashboard:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

When using the Supabase local dev CLI, the email templates are configured in `supabase/config.toml`. The `token_hash` parameter pattern is supported in all Supabase versions that support `verifyOtp`.

## Manual verification checklist

After any change to these templates or the callback route, verify all flows:

- [ ] **Driver invite** — admin invites a new driver; driver opens link in a fresh browser; lands on `/set-password?mode=invite`; sets password; redirected to `/driver`.
- [ ] **Staff invite** — same flow for staff; redirected to `/`.
- [ ] **Password recovery (same browser)** — request reset; click link in same browser; sets new password; redirected to the original destination or role home.
- [ ] **Password recovery (different browser/device)** — request reset on browser A; open link on browser B; flow completes without error.
- [ ] **Expired link** — wait for the token to expire (or use an already-used token); confirm `/set-password` renders the invalid-link state, not a crash or redirect to `/signin`.
- [ ] **Direct `/set-password` access** — navigate directly to `/set-password?mode=recovery` without going through the callback; confirm the invalid-link state is shown (no form).
- [ ] **Missing Profile** — trigger the callback for a user whose `Profile` row does not exist; confirm redirect to `/auth-error?reason=provisioning`.
