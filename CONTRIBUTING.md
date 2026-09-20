# Contributing to CabFleet

Thank you for your interest in contributing.

## Prerequisites

- Node.js 20
- A Supabase project (Auth + Postgres) for local development

## Setup

```bash
cp .env.example .env.local   # fill in real Supabase + DB values
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Never commit `.env.local` or any secrets.

## Before opening a PR

Run the full local check suite:

```bash
npm run lint && npm run typecheck && npm test
```

## Code conventions

Follow the module layout and mutation patterns in [AGENTS.md](AGENTS.md). Every feature lives under `src/modules/<feature>/` with `actions/`, `services/`, `queries/`, `validators/`, and `components/`.

## Questions

Open a GitHub issue for bugs or feature requests. For security vulnerabilities, see [SECURITY.md](SECURITY.md).
