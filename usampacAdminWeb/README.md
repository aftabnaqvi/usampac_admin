# USAMPAC Admin Web App (Next.js)

This is a minimal admin interface to review and approve/reject candidate profiles stored in Supabase.

What it includes:
- Email/password login (Supabase Auth)
- Pending list (`api.candidate_profiles_pending`)
- Approve/Reject using RPCs (`api.approve_candidate`, `api.reject_candidate`)
- RLS protects data; only admins (`public.app_users.role = 'ADMIN'`) can view/update

## Quick start

1) Create the project locally (optional; this repo already has the source)
2) Configure environment:

Create a file `AdminWebApp/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

3) Install and run:
```
cd AdminWebApp
npm i
npm run dev
```
Open `http://localhost:3000`.

4) Create an admin user
- Create a user in Supabase Auth and map it in `public.app_users` with `role='ADMIN'` and `auth_sub=<user_id uuid>`.

5) Deploy
- Deploy to Vercel (or any Node host). Set the two env vars in the dashboard.

## Structure
- `app/login` — login page
- `app/pending` — list of pending candidates with Approve/Reject forms
- `app/pending/actions.ts` — server actions that invoke RPCs
- `lib/supabaseServer.ts` — Supabase server client using cookies
- `components` — shared UI (optional/minimal)

## Notes
- RLS ensures non-admins see no data.
- Approve/Reject is audited via the RPCs (`approved_by`, `approved_at`, `reviewer_notes`).
- You can add notes while approving/rejecting.


