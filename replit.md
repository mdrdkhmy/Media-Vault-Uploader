# Media Vault

A full-stack media uploader that persistently stores images, PDFs, and videos, generates public links, and supports preview, copy, and permanent deletion.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/media-vault run dev` — run the web app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Netlify deployment is configured at the repository root in `netlify.toml`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Replit development storage: local filesystem through the Express API
- Netlify production storage: Netlify Blobs through a serverless function
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/media-vault/src/` — React frontend
- `artifacts/media-vault/netlify/functions/api.ts` — production Netlify API
- `artifacts/api-server/src/routes/files.ts` — Replit development API
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `netlify.toml` — Netlify build, functions, and routing configuration

## Architecture decisions

- The frontend uses one `/api` contract in both environments.
- Replit preview uses the shared Express API; Netlify rewrites the same paths to a serverless function.
- File bytes and metadata live in Netlify Blobs in production, so no separate database or storage credentials are required.

## Product

- Upload images, PDFs, and videos by dropping or browsing.
- View a persistent newest-first media library and storage summary.
- Preview assets, copy public URLs, and permanently delete files.

## User preferences

- Keep the app straightforward to run on Replit and deploy on Netlify.
- Maintain a modern, clean, responsive interface with visible upload feedback.

## Gotchas

- Re-run API codegen after every OpenAPI change.
- Netlify function request limits vary by plan; large-video uploads may need a direct-upload storage provider later.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
