import { useRef, useCallback } from 'react';

export const useMouseMovement = () => {
  const lastMouseY = useRef(0);
  const mouseEnterTime = useRef<number>(0);
  const mouseSpeedRef = useRef<number>(0);

  const calculateMouseSpeed = useCallback((currentY: number, timestamp: number): number => {
    const deltaTime = timestamp - mouseEnterTime.current;
    const deltaY = Math.abs(currentY - lastMouseY.current);
    if (deltaTime > 0 && deltaTime < 1000) {
      return deltaY / deltaTime;
    }
    return mouseSpeedRef.current;
  }, []);

  const updateMousePosition = useCallback((clientY: number) => {
    const now = performance.now();
    mouseSpeedRef.current = calculateMouseSpeed(clientY, now);
    lastMouseY.current = clientY;
  }, [calculateMouseSpeed]);

  const startMouseTracking = useCallback((initialY: number) => {
    mouseEnterTime.current = performance.now();
    lastMouseY.current = initialY;
    mouseSpeedRef.current = 0;
  }, []);

  return {
    mouseSpeedRef,
    updateMousePosition,
    startMouseTracking,
    getMouseSpeed: () => mouseSpeedRef.current,
  };
};