<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase / database changes

- Put DDL in **new files** under `ivvlyn-dashboard/supabase/migrations/` (timestamped names).
- Apply with the CLI from `ivvlyn-dashboard/`: add **`SUPABASE_DB_PASSWORD`** to `.env.local`, then **`npm run db:link`**, then **`npm run db:push`**. See `docs/supabase-pending-work.md` §0.
- **`npm run db:verify`** checks service-role connectivity (no migration writes).
- Do **not** ask maintainers to paste SQL in the Supabase SQL editor as the default workflow unless they want a one-off hotfix.
