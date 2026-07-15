import { useEffect, useRef, type RefObject } from 'react';

/**
 * Closes an open dropdown/menu/popover when a mousedown lands outside all of
 * the given refs. Pass a second ref for widgets whose panel is portal-rendered
 * elsewhere in the DOM (e.g. document.body) and isn't a descendant of the
 * trigger element.
 *
 * `onOutsideClick` is read via a ref internally, so the document listener is
 * only added/removed when `active` (or the refs array) changes, not on every
 * render — callers can safely pass a fresh inline callback each render.
 */
export function useOutsideClick(
  active: boolean,
  onOutsideClick: () => void,
  refs: RefObject<HTMLElement>[]
) {
  const callbackRef = useRef(onOutsideClick);
  callbackRef.current = onOutsideClick;

  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInside = refs.some((ref) => ref.current?.contains(target));
      if (!isInside) callbackRef.current();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}