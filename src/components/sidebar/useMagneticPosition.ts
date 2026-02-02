import { useState, useRef, useCallback, useEffect } from 'react';
import { MAGNETIC_SMOOTHING_FACTOR } from './constants';

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