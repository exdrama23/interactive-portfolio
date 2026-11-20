import { useRef, useCallback } from 'react';

export const useMouseMovement = () => {
  const lastY = useRef(0);
  const lastT = useRef(0);
  const speedRef = useRef(0);
  const enterT = useRef(0);

  const startMouseTracking = useCallback((initialY: number) => {
    const now = performance.now();
    enterT.current = now;
    lastT.current = now;
    lastY.current = initialY;
    speedRef.current = 0;
  }, []);

  const updateMousePosition = useCallback((clientY: number) => {
    const now = performance.now();
    const dt = now - lastT.current;
    if (dt > 0 && dt < 200) {
      const instant = Math.abs(clientY - lastY.current) / dt;
      speedRef.current = speedRef.current * 0.35 + instant * 0.65;
    }
    lastY.current = clientY;
    lastT.current = now;
  }, []);

  const getMouseSpeed = useCallback(() => speedRef.current, []);
  const getElapsed = useCallback(() => performance.now() - enterT.current, []);

  return {
    mouseSpeedRef: speedRef,
    updateMousePosition,
    startMouseTracking,
    getMouseSpeed,
    getElapsed,
  };
};
