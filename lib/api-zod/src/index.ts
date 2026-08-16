export * from "./generated/api";
// Note: ./generated/types is intentionally excluded — it duplicates names
// from ./generated/api but as plain interfaces instead of Zod schemas.
// The Zod schemas in ./generated/api serve both runtime validation (.safeParse)
// and static typing (z.infer<>). If you need the plain interfaces, import from
// ./generated/types directly.
