import { animate, useMotionValue, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
}

/**
 * A number that counts up (or down) to its new value.
 *
 * The moving digits are decoration, so they are hidden from screen readers;
 * the real value sits next to them for assistive technology only. With
 * reduced motion the number simply changes.
 */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const visible = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(value);
  const reduced = useReducedMotion();
  const latestFormat = useRef(format);
  useEffect(() => {
    latestFormat.current = format;
  });

  useEffect(() => {
    const write = (current: number) => {
      if (visible.current) visible.current.textContent = latestFormat.current(Math.round(current));
    };
    if (reduced) {
      motionValue.set(value);
      write(value);
      return;
    }
    const unsubscribe = motionValue.on('change', write);
    const controls = animate(motionValue, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, reduced, motionValue]);

  return (
    <span className={className}>
      <span ref={visible} aria-hidden="true">
        {format(Math.round(motionValue.get()))}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
