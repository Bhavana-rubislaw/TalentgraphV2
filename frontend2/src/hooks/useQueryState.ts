import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// ── Parse helpers ──────────────────────────────────────────────
export function parseIntParam(value: string | null, fallback: number | null = null): number | null {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return isNaN(n) ? fallback : n;
}

export function parseEnumParam<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  return fallback;
}

// ── Main hook ──────────────────────────────────────────────────
export function useQueryState() {
  const [searchParams, setSearchParams] = useSearchParams();

  /** Read one param, returning defaultValue if missing */
  const getParam = useCallback(
    (name: string, defaultValue = '') => searchParams.get(name) ?? defaultValue,
    [searchParams]
  );

  /** Set a single param (replaceState by default) */
  const setParam = useCallback(
    (name: string, value: string | null | undefined, options?: { replace?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value != null && value !== '') next.set(name, value);
          else next.delete(name);
          return next;
        },
        { replace: options?.replace ?? true }
      );
    },
    [setSearchParams]
  );

  /** Set multiple params at once (replaceState by default) */
  const setParams = useCallback(
    (
      updates: Record<string, string | number | null | undefined>,
      options?: { replace?: boolean }
    ) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(updates)) {
            if (v != null && v !== '') next.set(k, String(v));
            else next.delete(k);
          }
          return next;
        },
        { replace: options?.replace ?? true }
      );
    },
    [setSearchParams]
  );

  return { searchParams, getParam, setParam, setParams };
}
