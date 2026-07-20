import { useCallback, useEffect, useState, type TouchEvent } from 'react';

/**
 * Shared card-carousel navigation: index state, clamped prev/next, touch-swipe
 * gesture support, and optional left/right arrow-key navigation. `totalCount`
 * should be the length of whatever list is actually being paged through (post
 * any active filters) — the hook only clamps against it, callers own filtering.
 */
export function useSwipeCarousel(
  totalCount: number,
  options?: { minSwipeDistance?: number; enableArrowKeys?: boolean }
) {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = options?.minSwipeDistance ?? 50;
  const enableArrowKeys = options?.enableArrowKeys ?? false;

  const handleNext = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, Math.max(totalCount - 1, 0)));
  }, [totalCount]);

  const handlePrevious = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (touchStart == null || touchEnd == null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    else if (distance < -minSwipeDistance) handlePrevious();
  }, [touchStart, touchEnd, minSwipeDistance, handleNext, handlePrevious]);

  useEffect(() => {
    if (!enableArrowKeys || totalCount === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrevious();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableArrowKeys, totalCount, handleNext, handlePrevious]);

  return {
    index,
    setIndex,
    handleNext,
    handlePrevious,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
