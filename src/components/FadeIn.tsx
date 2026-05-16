/**
 * FadeIn — Premium scroll-reveal animation component
 * ====================================================
 * Uses IntersectionObserver for performant fade-in + upward motion on scroll.
 * Apple/Linear-style: calm, elegant, restrained.
 *
 * USAGE:
 *   <FadeIn>
 *     <div>Content appears with subtle animation</div>
 *   </FadeIn>
 *
 *   <FadeIn delay={200} className="custom-class">
 *     ...
 *   </FadeIn>
 */

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  /** Delay in ms before animation starts after element enters viewport */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Distance to translate up from (px). Default: 20 */
  distance?: number;
  /** Animation duration in ms. Default: 600 */
  duration?: number;
  /** Trigger threshold (0–1). Default: 0.15 */
  threshold?: number;
}

export function FadeIn({
  children,
  delay = 0,
  className = '',
  distance = 20,
  duration = 600,
  threshold = 0.15,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : `translateY(${distance}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
