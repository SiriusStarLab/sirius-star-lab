---
name: Object storage S3 migration
description: How the Replit GCS sidecar was replaced with AWS S3 and the bundling gotcha
---

## Rule
`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` must be in the `allowlist` array in `artifacts/api-server/build.ts`. If they are not, esbuild marks them as `external`, the CJS bundle ships without them, and PM2 crashes with `Cannot find module '@aws-sdk/client-s3'` at startup.

**Why:** The build.ts allowlist controls what gets bundled vs left as a runtime require. The artifact runs from `/opt/sirius/artifacts/api-server/dist/index.cjs` which has no surrounding `node_modules` — everything must be bundled in.

**How to apply:** Any new npm package added to api-server that must work on Kamatera needs to be added to the allowlist in build.ts, or it needs to be manually installed in `/opt/sirius/artifacts/api-server/node_modules`.

## What changed
- `lib/objectStorage.ts` — replaced `@google-cloud/storage` + Replit sidecar (port 1106) with `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- `lib/objectAcl.ts` — replaced GCS `File` type with `S3ObjectRef = { bucket: string; key: string }`. ACL policy still stored as object metadata (`aclpolicy` key).
- Bucket: `sirius-storage` (eu-west-1). Private uploads at `private/uploads/{uuid}`, public files at `public/{path}`.
- Env vars on Kamatera: `STORAGE_BUCKET=sirius-storage`, `STORAGE_REGION=eu-west-1`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- Old Replit env vars (`PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`) linger in the system env on Kamatera but are ignored by the new code.

## Node version note
AWS SDK v3 issues a warning on Node 20 that support ends after Jan 2027. Not a problem until then. Upgrade Node to 22 before that date.
