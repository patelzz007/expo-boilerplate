# src/shared

The app's shared contracts (rules/05): zod schemas, the types inferred from them, and small pure helpers.
No React, no React Native, no I/O — everything here would run unchanged on a server.

It is a subset of the reference starter kit's `packages/shared`, kept at the **same paths and wording** so a
schema can be compared with (or re-synced from) its source. Add a file only when the app needs it.

## Layout

```
src/shared/
  index.ts                     the ONE public entry point — import from "@/shared", never a file inside
  contexts/<context>/          one folder per bounded context (identity, reporting, …)
    index.ts                   the context's public exports
    schemas/<topic>.ts         zod schemas + `z.infer` types (+ constants they own)
    schemas/__tests__/         tests beside the code (rules/11)
  schemas/api/                 cross-context building blocks (epoch ms, email address)
  lib/                         pure helpers (assertNever, ToDiscoUnion)
```

## Rules

- **Parse once at the boundary** (rules/28): anything untrusted — secure-store reads, deep-link params,
  network responses — goes through a schema's `parse` / `safeParse` where it enters the app; code inward
  takes the `z.infer<>` type and never re-checks shapes with `typeof`.
- One schema per shape: never hand-write an interface that duplicates a schema (rules/00).
- A context imports another context only through that context's `schemas/` file, never the reverse
  dependency; the app imports only `@/shared`.
