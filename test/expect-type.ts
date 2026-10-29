// A compile-time type equality check for Jest suites — the subset of Vitest's `expectTypeOf` the
// ported tests use. It does nothing at runtime; `pnpm run typecheck` fails when the types differ,
// because the mismatch branch demands an argument the call does not pass.

/** `true` when A and B are the same type (not merely assignable). */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

interface TypeExpectation<A> {
  toEqualTypeOf<B>(...mismatch: Equal<A, B> extends true ? [] : ["the types differ"]): void;
}

/** `expectTypeOf<T>()` or `expectTypeOf(value)` — then `.toEqualTypeOf<Expected>()`. */
export function expectTypeOf<A>(): TypeExpectation<A>;
export function expectTypeOf<A>(value: A): TypeExpectation<A>;
export function expectTypeOf<A>(): TypeExpectation<A> {
  return { toEqualTypeOf: (): void => undefined };
}
