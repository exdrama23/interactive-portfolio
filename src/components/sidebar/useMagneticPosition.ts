import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionValue, type MotionValue } from 'framer-motion';
import { FLOATING_MENU_HEIGHT, MAGNETIC_TAU_MS } from './constants';

/** Mantém o blob dentro da viewport (antes ele saía metade da tela nas bordas). */
export const clampMagneticY = (y: number) => {
  const max = Math.max(0, window.innerHeight - FLOATING_MENU_HEIGHT);
  return Math.min(Math.max(0, y), max);
};

/**
 * Posição Y do blob.
 *
 * Antes: `setState` a cada frame com lerp fixo (0.35/frame) + spring do framer
 * por cima. Isso dependia da taxa de quadros e re-renderizava o React 60x/s.
 * Agora: uma MotionValue escrita direto no DOM por um único rAF, com
 * interpolação exponencial baseada em tempo (tau fixo), sem re-render.
 */
export const useMagneticPosition = (initialY: number = 0) => {
  const y = useMotionValue(initialY);
  const targetRef = useRef(initialY);
  const [running, setRunning] = useState(false);

  const updateMagneticPosition = useCallback((targetY: number) => {
    targetRef.current = clampMagneticY(targetY);
  }, []);

  const setExactPosition = useCallback(
    (value: number) => {
      const next = clampMagneticY(value);
      targetRef.current = next;
      y.set(next);
    },
    [y]
  );

  const getPosition = useCallback(() => y.get(), [y]);

  const startAnimation = useCallback(() => setRunning(true), []);
  const stopAnimation = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - previous, 64);
      previous = now;
      const current = y.get();
      const target = targetRef.current;
      const k = 1 - Math.exp(-dt / MAGNETIC_TAU_MS);
      const next = current + (target - current) * k;
      y.set(Math.abs(target - next) < 0.1 ? target : next);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, y]);

  return {
    magneticY: y as MotionValue<number>,
    updateMagneticPosition,
    setExactPosition,
    getPosition,
    startAnimation,
    stopAnimation,
  };
};
