
import { useRef, useCallback, useEffect, useState } from 'react';
import { MAGNETIC_SMOOTHING_FACTOR } from './constants';

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

export const useMagneticPosition = (initialY: number = 0) => {
  const [magneticY, setMagneticY] = useState(initialY);
  const targetYRef = useRef<number>(initialY);
  const animationRef = useRef<number | null>(null);

  const animate = useCallback(() => {
    const target = targetYRef.current;
    setMagneticY(prev => {
      const diff = target - prev;
      const next = prev + diff * MAGNETIC_SMOOTHING_FACTOR;
      if (Math.abs(next - target) < 0.5) {
        animationRef.current = null;
        return target;
      }
      animationRef.current = requestAnimationFrame(animate);
      return next;
    });
  }, []);

  const updateMagneticPosition = useCallback((targetY: number) => {
    targetYRef.current = targetY;
    if (animationRef.current == null) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const setExactPosition = useCallback((y: number) => {
    targetYRef.current = y;
    setMagneticY(y);
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    if (animationRef.current == null) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    magneticY,
    updateMagneticPosition,
    setExactPosition,
    startAnimation,
    stopAnimation,
  };
};