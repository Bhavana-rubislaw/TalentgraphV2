/**
 * useServerAction — Optimistic update hook enforcing backend source-of-truth.
 *
 * Pattern:
 *   1. Snapshot current state
 *   2. Apply optimistic UI update immediately
 *   3. Fire API call
 *   4. On success  → overwrite state with server response (server timestamps)
 *   5. On failure  → rollback to snapshot + surface error
 *
 * UI timestamps must ALWAYS come from server response fields
 * (created_at / updated_at / applied_at / read_at), never from Date.now().
 */

import { useState, useCallback } from 'react';

interface UseServerActionOptions<T> {
  /** Current state or the item being mutated */
  currentState: T;
  /** Apply the optimistic change before the API returns */
  optimisticUpdate: (current: T) => T;
  /** The actual API call — must resolve to the authoritative server value */
  apiCall: () => Promise<T | void>;
  /** Called with server response if the API returns the updated record */
  onSuccess?: (serverValue: T | void) => void;
  /** Called with error on failure — after state has been rolled back */
  onError?: (err: Error) => void;
}

interface UseServerActionResult {
  loading: boolean;
  error: string | null;
  execute: () => Promise<void>;
}

export function useServerAction<T>({
  currentState,
  optimisticUpdate,
  apiCall,
  onSuccess,
  onError,
}: UseServerActionOptions<T>): UseServerActionResult & { optimisticState: T } {
  const [optimisticState, setOptimisticState] = useState<T>(currentState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    const snapshot = optimisticState;
    // Optimistic apply
    setOptimisticState(optimisticUpdate(snapshot));
    setLoading(true);
    setError(null);

    try {
      const serverValue = await apiCall();
      // Replace with authoritative server value (carries server timestamps)
      if (serverValue !== undefined && serverValue !== null) {
        setOptimisticState(serverValue as T);
      }
      onSuccess?.(serverValue);
    } catch (e: unknown) {
      // Rollback
      setOptimisticState(snapshot);
      const msg = e instanceof Error ? e.message : 'An error occurred';
      setError(msg);
      onError?.(e instanceof Error ? e : new Error(msg));
    } finally {
      setLoading(false);
    }
  }, [optimisticState, optimisticUpdate, apiCall, onSuccess, onError]);

  return { optimisticState, loading, error, execute };
}

/**
 * parseServerTimestamp — parse a server ISO-8601 string.
 * NEVER use `new Date()` or `Date.now()` for display; always use this.
 */
export function parseServerTimestamp(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * formatServerTimestamp — format a server timestamp for display.
 * Relative for recency; absolute for older items.
 */
export function formatServerTimestamp(
  iso: string | undefined | null,
  opts: { relative?: boolean } = { relative: true }
): string {
  const d = parseServerTimestamp(iso);
  if (!d) return '—';

  if (opts.relative) {
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60)  return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  }

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
