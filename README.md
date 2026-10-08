# Ladang — Farm Visiting PWA

First working version of a friendly English, Bahasa Malaysia and Simplified Chinese farm notebook. No signatures, land documents or manual report submission.

## Local development

Use Node.js 20.19 or newer. Run `npm install`, then `npm run dev`. Run `npm run build` for the GitHub Pages output in `dist/`.

## Hosting and services

GitHub Pages serves only the public application code. Farmer records, phone numbers, photographs and precise coordinates must never be committed to GitHub. Shared organisation records require a separately configured authenticated backend with organisation and team access policies. Environment variables in `.env.example` are public browser configuration; never put service-role keys in them.

## Implemented

- Offline application loading and IndexedDB record persistence.
- Farm and visit editing, recoverable Trash and explicit permanent deletion.
- Backup validation and restore, including photographs.
- Excel reporting with embedded photographs.
- Supervisor staff/date/state filters and distinct visit/farm counts.
- Esri map attribution and honest map-unavailable state offline.
- English, Malay and Chinese interface. Original free text is preserved.
- Supabase sync adapter and backend schema with team access policies and optimistic revision checks.

## GitHub Pages

Repository Settings → Pages → Source must be **GitHub Actions**. Each push to `main` builds and deploys the PWA. The site is served at https://stanleywoosweeleong.github.io/visitinglog/ .

## Shared-team setup (not configured yet)

1. Create a Supabase project and run `backend/schema.sql` in its SQL editor.
2. Create staff accounts using Supabase Auth. Provision an organisation and memberships through the administrator SQL editor; never allow staff to assign their own roles.
3. Every member can view all farms and visits within their organisation. No supervisor/staff assignments are required. Each author retains editing access to their own records.
4. Add repository Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then deploy again. These are public browser configuration protected by server access policies.
5. Verify with separate staff and supervisor accounts that unauthorised organisations cannot read records.

## Remaining production work

- Free-text translation needs a deployed authenticated `translate-note` function returning `{translations:{en:{note,advice},ms:{note,advice},zh:{note,advice}}}`. Until then the UI says translation pending; it never invents translations.
- Scheduled closed-app reminders need a push service and server scheduler. Selecting a reminder currently stores the preference only; notifications are not yet sent.
- Photos are currently stored inline in records for the first version. Production should use private object storage with verified uploads and downloads before enabling phone photo cleanup. Cleanup is deliberately disabled.
- Shared permanent deletion must be implemented as an administrator operation with documented backup retention. Local-only Trash records can be permanently deleted with explicit confirmation.
- Team authentication and offline account isolation require a security review before real organisational use. Use synthetic data for the initial preview.
- Esri's online topographic map is used with attribution; tiles are not cached for offline use. Review service terms and intended usage before a wide rollout.

Backup restore is additive: existing IDs are skipped, protecting current records from accidental overwrite. Downloaded backups are sensitive and should be kept securely. No automatic purge is performed after export.

Scheduled notifications while the PWA is closed require a push service and server scheduler. Browser timers alone are not reliable for this requirement.
