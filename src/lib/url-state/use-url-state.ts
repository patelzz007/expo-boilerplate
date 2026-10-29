// ============================================
// lib/url-state/use-url-state.ts - read/write a URL state from a screen
// ============================================
// `useUrlState(codec)` returns `[state, update]`:
//   - `state` is the codec's zod parse of the screen's search params, so it is correct on a deep
//     link and whenever the params change — there is no copy to keep in sync.
//   - `update(patch)` merges `patch` into the CURRENT URL state and writes the result back to the
//     screen's params.
//
// The engine is nuqs (`useQueryStates`, mounted by `UrlStateProvider` on Expo Router):
//   - An update changes `state` in the SAME render as the press that caused it — every hook reading
//     those keys re-renders at once — and the route's params follow on the next tick.
//   - Several updates in the same tick (a filter change followed by "back to page 1") are applied on
//     top of each other (the updater sees the queued values), then written as one change.
//
// The codec stays the single declaration of the state (zod per param); nuqs only carries each owned
// key's raw string. Screens never import nuqs (rules/03, "URL state").
//
// History: on the web, `"push"` adds a browser history entry and `"replace"` overwrites it. Expo
// Router has no shallow history push, so on a phone both write the screen's params in place — the
// back button leaves the screen, as people expect, instead of stepping back through its pages. The
// option is kept so a screen's code reads the same as its web twin's.

import { parseAsString, useQueryStates } from "nuqs";
import * as React from "react";

import type { UrlState, UrlStateCodec, UrlStateShape } from "./url-state";

/** How an update is recorded in history (see the header: the same on a phone). */
export type UrlHistoryMode = "push" | "replace";

export interface UrlStateUpdateOptions {
  /** `"push"` (default) or `"replace"`. */
  readonly history?: UrlHistoryMode;
}

/** Merges `patch` into the current URL state and writes it; a patch that changes nothing is a no-op. */
export type UrlStateUpdate<TState> = (patch: Partial<TState>, options?: UrlStateUpdateOptions) => void;

/** Each URL key a codec owns → its raw value (`null` when absent). */
export type RawUrlParams = Readonly<Record<string, string | null>>;

/** The raw values as search params (absent keys left out), for `codec.parse`. */
export function rawUrlParamsToSearch(raw: RawUrlParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null) {
      params.set(key, value);
    }
  }
  return params;
}

/** `state` as the raw value of each URL key the codec owns (`null` for a param serialized away as its default). */
export function urlStateToRawParams<TShape extends UrlStateShape>(
  codec: UrlStateCodec<TShape>,
  state: UrlState<TShape>
): RawUrlParams {
  const params = new URLSearchParams(codec.serialize(state));
  return Object.fromEntries(codec.urlKeys.map((key: string): [string, string | null] => [key, params.get(key)]));
}

/** The two raw value sets carry the same value for every key of `next`. */
export function isSameRawUrlParams(current: RawUrlParams, next: RawUrlParams): boolean {
  return Object.entries(next).every(([key, value]): boolean => (current[key] ?? null) === value);
}

/** `[state, update]` for one URL state declared with `defineUrlState`. */
export function useUrlState<TShape extends UrlStateShape>(
  codec: UrlStateCodec<TShape>
): readonly [UrlState<TShape>, UrlStateUpdate<UrlState<TShape>>] {
  // One raw string parser per owned key: the codec, not nuqs, decides what a value means.
  const rawParsers = React.useMemo(
    () => Object.fromEntries(codec.urlKeys.map((key: string) => [key, parseAsString])),
    [codec]
  );
  const [raw, setRaw] = useQueryStates(rawParsers);
  const state: UrlState<TShape> = React.useMemo(
    (): UrlState<TShape> => codec.parse(rawUrlParamsToSearch(raw)),
    [codec, raw]
  );
  const update = React.useCallback(
    (patch: Partial<UrlState<TShape>>, options?: UrlStateUpdateOptions): void => {
      void setRaw(
        (current: RawUrlParams): RawUrlParams => {
          const next: RawUrlParams = urlStateToRawParams(codec, {
            ...codec.parse(rawUrlParamsToSearch(current)),
            ...patch,
          });
          // Nothing to write.
          return isSameRawUrlParams(current, next) ? {} : next;
        },
        { history: options?.history ?? "push" }
      );
    },
    [codec, setRaw]
  );
  return [state, update];
}
