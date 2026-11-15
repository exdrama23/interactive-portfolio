import { useRef, useCallback } from 'react';

/**
 * Mede a velocidade do cursor em px/ms.
 *
 * O cálculo antigo usava o instante da ENTRADA na faixa como base de tempo
 * (`mouseEnterTime`), e não o evento anterior — então a "velocidade" decaía
 * artificialmente com o tempo e a decisão dependia de um único check em 10ms.
 * Agora a base é o evento anterior e a leitura passa por uma média exponencial,
 * que não depende do polling rate do mouse (125Hz x 1000Hz dão o mesmo número).
 */
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
    // dt > 200ms significa cursor parado: não é "movimento rápido".
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
