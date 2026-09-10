# Media Vault

A full-stack file uploader for images, PDFs, and videos. Every upload receives a public URL and remains available until it is permanently deleted.

## Features

- Drag-and-drop and file-browser uploads
- Image, PDF, and video support
- Persistent file bytes and metadata
- Newest-first responsive media grid
- Public preview links with one-click copy
- Permanent deletion with confirmation
- Upload progress feedback and polished loading, empty, and error states
- Netlify-ready serverless API backed by Netlify Blobs

## Run on Replit

The project uses the existing managed workflows:

- `artifacts/media-vault: web`
- `artifacts/api-server: API Server`

The Replit API server stores development uploads under its local `data/media-vault` directory. This keeps files available across refreshes and workflow restarts during development.

## Deploy to Netlify

The repository root contains `netlify.toml`, so Netlify can detect the build automatically.

1. Push or import this repository into Netlify.
2. Keep the base directory set to the repository root.
3. Deploy the site.

Netlify will:

- run `pnpm --filter @workspace/media-vault run build`
- publish `artifacts/media-vault/dist/public`
- deploy the function in `artifacts/media-vault/netlify/functions/api.ts`
- route `/api/*` to the function
- store uploads and metadata in the `media-vault` Netlify Blobs store

No storage API key is required when the function runs inside Netlify. Netlify automatically supplies the site context used by Netlify Blobs.

## Main structure

```text
artifacts/
  media-vault/
    src/                       React frontend
    netlify/functions/api.ts  Netlify serverless API
  api-server/
    src/routes/files.ts       Replit development API
lib/
  api-spec/openapi.yaml       API contract
  api-client-react/           Generated React Query client
  api-zod/                    Generated server validation
netlify.toml                  Netlify build and routing configuration
```

## API

- `GET /api/files` — list files, newest first
- `POST /api/files` — upload one multipart file using the `file` field
- `GET /api/files/summary` — get counts and total bytes
- `GET /api/files/:id/content` — access the public file
- `DELETE /api/files/:id` — permanently delete bytes and metadata

The application accepts MIME types matching `image/*`, `video/*`, and `application/pdf`. Effective upload limits on Netlify depend on the limits of the selected Netlify plan and function runtime.