# Backend deployment checklist for the agent

Do not ask the user to write SQL. Use the connected Supabase integration once authorised.

1. Inspect the connected account's organisations and projects. Create a dedicated project for Visitinglog if no suitable project exists. Start with a free plan; do not buy a subscription. Prefer a nearby supported region after checking project options.
2. Apply `schema.sql` to a new database only, then migration `004_record_validation.sql`. Use `002_shared_team_dashboard.sql` only if the original supervisor-based schema was already deployed.
3. Prepare authentication with the GitHub Pages site URL and exact redirect allowlist. Provision the first organisation and the user's membership after the user signs in. Do not create staff passwords for the user or expose administrator credentials.
4. Obtain the project URL and publishable/anon key. Configure GitHub Actions variables and deploy. Never expose a service-role key in Vite environment variables or source control.
5. Verify two members of the same organisation can read the same visit, that another organisation cannot, that authors can edit their own visits, and that stale revisions are rejected.
6. Private photo storage preparation is in `003_private_photos.sql` and `src/photos.js`. These helpers are tested but not yet wired to sync or cleanup. Wire them before enabling cleanup; validate cloud bytes before removing local photo copies, and rehydrate for Excel and backup exports.
7. Deploy and test translation and reminder services only with configured provider credentials. Do not claim notifications or translations are active until end-to-end tests pass.
8. Test sign-in, offline capture, reconnect, backup/restore, real photo download, and organisation isolation before recommending real records.

The Supabase integration is connected. Project `uqstiltepalfvydwynkr` is active in Singapore. Schema, access provisioning, private storage and hardened functions are deployed. Sign-in uses the exact GitHub Pages redirect URL. The initial allowlisted administrator is `standphoto@gmail.com`.
