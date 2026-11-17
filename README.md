# RoofLink

University-focused accommodation discovery and connection platform connecting students, landlords, and property agents.

## Stack
- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS** + shadcn/ui-ready structure
- **Supabase** (PostgreSQL, Auth, Storage, RLS)
- **Vercel** deployment target

## Features (current scaffold)
- Role-based access: student, agent, landlord, admin (protected routes via middleware + server checks)
- Public browse of **approved** listings only
- Agent/landlord dashboards: create draft listings, submit for review
- Admin dashboard: approve/reject listings with audit logging, view reports/audit records
- Student dashboard: view saved properties and enquiries (data-backed; UI for save/enquire actions requires Supabase config)
- Supabase migrations for schema, RLS policies, and storage bucket

## Getting started

### Prerequisites
- Node.js 20+ and npm
- A Supabase project (hosted or local Supabase CLI)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template and fill values (never commit secrets):
   ```bash
   cp .env.example .env.local
   ```
   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
3. Apply database migrations (in order) to your Supabase project:
   - `supabase/migrations/0001_init_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/migrations/0003_storage.sql`
   - Optionally `supabase/seed/seed.sql` for a default university (dev only)
4. Bootstrap the first admin securely (do not self-elevate via client):
   - Create user in Supabase Auth, then run with admin privileges:
     ```sql
     update public.profiles set role = 'admin' where id = '<user-uuid>';
     ```
5. Run the app:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run start` – start production server
- `npm run lint` – ESLint
- `npm run typecheck` – TypeScript checks

## Project structure
```
app/                # App Router routes (public, auth, student, agent, landlord, admin)
components/         # ui/ and domain/ components
lib/                # supabase clients, auth helpers, validators, utils
types/              # shared DB/app types
supabase/           # migrations/ and seed/
middleware.ts       # session refresh and role-based route protection
```

## Security notes
- RLS enabled on all application tables; approval workflow enforced server-side and in policies.
- Public listings queries must filter `status='approved'`.
- Never expose Supabase service-role keys to the browser or commit secrets. Use `.env.local` (ignored) and Vercel env vars.
- No mock/fabricated users or listings; no fake verification badges.

## Testing
- **Local:** run `npm run lint` and `npm run typecheck` (and `npm run build`) for routine validation.
- **Kane CLI (browser E2E):** responsible for meaningful browser journeys/regression. Do not claim Kane tests executed unless `kane-cli` has been invoked and results inspected.
  - Verified in this environment: `kane-cli --help` succeeds (see environment report in plan). No Kane E2E test cases were executed as part of this scaffold.

## Deployment
- Target: Vercel. Configure Supabase env vars in Vercel project settings. Run migrations against the target Supabase project before deploy.
