# CabFleet

Staff desk, customer portal, and driver portal for cab dispatch. Next.js App Router, Prisma, and Supabase.

This is not the TailAdmin dashboard template. CabFleet started from TailAdmin's MIT UI and is a working fleet product.

## Features

- Phone-first staff booking desk
- Customer self-serve book + trip status
- Driver claim / assigned trips
- Booking state machine (`transitionBookingStatus` / `claimBooking` only)
- Optional Razorpay checkout when the install country is India
- PDF invoices with a configurable tax-ID line
- First-run `/setup` wizard (country, currency, timezone, phone region)

## Requirements

- Node.js 20
- A Supabase project (Auth + Postgres)
- `npm ci --legacy-peer-deps` (`nuqs` has a stale peer dep)

## Setup

```bash
cp .env.example .env.local   # fill Supabase + DATABASE_URL + DIRECT_URL + AUTH_PROOF_SECRET
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate dev
# Paste prisma/sql/01_profile_sync.sql (and later numbered SQL as needed) in the Supabase SQL editor
npx prisma db seed
npm run dev
```

Open `/setup`, pick the country this install runs in, then `/signup`. Promote yourself:

```sql
update public."Profile" set role = 'ADMIN' where email = 'you@example.com';
```

Demo accounts (after seed + setup): `npx tsx scripts/create-demo-desk.ts`

## Tests

```bash
npm test
npm run lint
npm run typecheck
npm run test:e2e          # landing + CSP; live desk/trip specs skip without E2E_* creds
```

## Docs

- [Architecture](docs/architecture.md)
- [Web app security](docs/web-app-security.md)
- [REST v1](docs/api/README.md)
- [UI tokens](docs/ui-styling.md)
- [Agent conventions](AGENTS.md)

## License

MIT. Includes UI originally released by TailAdmin under MIT. See `LICENSE`.

## Security

See [SECURITY.md](SECURITY.md).
