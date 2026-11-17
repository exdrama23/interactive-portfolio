import { useState, useRef, useCallback, useEffect } from 'react';
import type { MenuState } from './sidebar/types';
import {
  FLOATING_MENU_HEIGHT,
  FLOATING_MENU_WIDTH,
  FLOATING_AREA_WIDTH,
  EDGE_ZONE_WIDTH,
  HOVER_INTENTION_DELAY,
  MAX_MOUSE_SPEED_FOR_MAGNETIC,
  EXPAND_ANIMATION_DURATION,
  BLOB_GRACE_MS,
} from './sidebar/constants';
import { useMouseMovement } from './sidebar/useMouseMovement';
import { useMagneticPosition, clampMagneticY } from './sidebar/useMagneticPosition';
import EdgeZone from './sidebar/EdgeZone';
import FloatingMenu from './sidebar/FloatingMenu';
import ExpandingMenu from './sidebar/ExpandingMenu';
import FullscreenMenu from './sidebar/FullscreenMenu';
import PeekTab from './sidebar/PeekTab';

const hasFinePointer = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

const Sidebar = () => {
  const [state, setState] = useState<MenuState>('idle');
  const [expandY, setExpandY] = useState(0);
  // Desktop com mouse: usa a faixa lateral. Touch/coarse: só o botão hamburguer.
  const [canHover, setCanHover] = useState(hasFinePointer);

  const stateRef = useRef<MenuState>(state);
  const intentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const edgeZoneRef = useRef<HTMLDivElement>(null);
  const floatingMenuRef = useRef<HTMLDivElement>(null);

  const { updateMousePosition, startMouseTracking, getMouseSpeed, getElapsed } = useMouseMovement();
  const {
    magneticY,
    updateMagneticPosition,
    setExactPosition,
    getPosition,
    startAnimation,
    stopAnimation,
  } = useMagneticPosition(0);

  /* ---------------------------------------------------------------- */
  /* Intenção / permanência                                            */
  /* ---------------------------------------------------------------- */

  const clearIntentTimeout = useCallback(() => {
    if (intentTimeoutRef.current) {
      clearTimeout(intentTimeoutRef.current);
      intentTimeoutRef.current = null;
    }
  }, []);

  const clearGraceTimeout = useCallback(() => {
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
      graceTimeoutRef.current = null;
    }
  }, []);

  /** Sai do modo magnético, mas só depois de uma pequena tolerância. */
  const scheduleIdle = useCallback(() => {
    clearGraceTimeout();
    graceTimeoutRef.current = setTimeout(() => {
      graceTimeoutRef.current = null;
      if (stateRef.current === 'edgeHover' || stateRef.current === 'magneticFollow') {
        stopAnimation();
        setState('idle');
      }
    }, BLOB_GRACE_MS);
  }, [clearGraceTimeout, stopAnimation]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      updateMousePosition(e.clientY);
      if (stateRef.current !== 'magneticFollow' && stateRef.current !== 'edgeHover') return;

      // Sai de cena quando o cursor se afasta da borda. Antes o blob ficava
      // "grudado" no mouse indefinidamente, porque o `mouseleave` da faixa era
      // engolido pelo próprio blob (que está por cima dela).
      const distanceFromEdge = window.innerWidth - e.clientX;
      if (distanceFromEdge > FLOATING_MENU_WIDTH + 20) {
        scheduleIdle();
        return;
      }
      clearGraceTimeout();
      updateMagneticPosition(e.clientY - FLOATING_MENU_HEIGHT / 2);
    },
    [clearGraceTimeout, scheduleIdle, updateMousePosition, updateMagneticPosition]
  );

  const handleMouseEnterEdgeZone = useCallback(
    (e: React.MouseEvent) => {
      clearIntentTimeout();
      clearGraceTimeout();
      startMouseTracking(e.clientY);

      if (stateRef.current === 'idle' || stateRef.current === 'fullscreen') {
        setState('edgeHover');
        setExactPosition(clampMagneticY(e.clientY - FLOATING_MENU_HEIGHT / 2));
        startAnimation();
      }
    },
    [clearGraceTimeout, clearIntentTimeout, setExactPosition, startAnimation, startMouseTracking]
  );

  const handleMouseLeaveEdgeZone = useCallback(
    (e: React.MouseEvent) => {
      const relatedTarget = e.relatedTarget;
      if (relatedTarget instanceof HTMLElement && floatingMenuRef.current?.contains(relatedTarget)) {
        return;
      }
      if (stateRef.current === 'edgeHover' || stateRef.current === 'magneticFollow') {
        scheduleIdle();
      }
    },
    [scheduleIdle]
  );

  const handleMenuClick = useCallback(() => {
    if (stateRef.current === 'magneticFollow' || stateRef.current === 'edgeHover') {
      setExpandY(getPosition());
      setState('expanding');
      setTimeout(() => setState('fullscreen'), EXPAND_ANIMATION_DURATION);
    }
  }, [getPosition]);

  const handleClose = useCallback(() => {
    setState('idle');
    // O cursor pode já estar sobre a faixa quando o menu fecha: re-arma na hora,
    // em vez de esperar um novo `mouseenter` que nunca vem.
    const { x, y } = pointerRef.current;
    if (window.innerWidth - x <= EDGE_ZONE_WIDTH * 2) {
      setExactPosition(clampMagneticY(y - FLOATING_MENU_HEIGHT / 2));
      setState('edgeHover');
    }
  }, [setExactPosition]);

  const handleOpenMenu = useCallback(() => {
    setExactPosition(window.innerHeight / 2 - FLOATING_MENU_HEIGHT / 2);
    setExpandY(clampMagneticY(window.innerHeight / 2 - FLOATING_MENU_HEIGHT / 2));
    setState('expanding');
    setTimeout(() => setState('fullscreen'), EXPAND_ANIMATION_DURATION);
  }, [setExactPosition]);

  useEffect(() => {
    const openFromOutside = () => {
      const current = stateRef.current;
      if (current === 'idle' || current === 'edgeHover' || current === 'magneticFollow') {
        handleOpenMenu();
      }
    };
    window.addEventListener('portfolio:open-sidebar', openFromOutside);
    return () => window.removeEventListener('portfolio:open-sidebar', openFromOutside);
  }, [handleOpenMenu]);

  /* ---------------------------------------------------------------- */
  /* Efeitos                                                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Reavalia o dispositivo (ex.: trocar de mouse para toque no 2-em-1).
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setCanHover(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Posição do cursor sempre disponível (usada ao fechar o menu).
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => window.removeEventListener('pointermove', onPointer);
  }, []);

  useEffect(() => {
    if (!canHover) return;
    if (state !== 'magneticFollow' && state !== 'edgeHover') return;
    const onMove = (e: MouseEvent) => handleMouseMove(e);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [state, canHover, handleMouseMove]);

  // Antes a decisão era um único check em 10ms. Agora reavalia a cada frame
  // enquanto o cursor está na faixa: se estiver devagar o bastante, engata.
  useEffect(() => {
    if (!canHover || state !== 'edgeHover') return;
    let frame = 0;
    const check = () => {
      if (stateRef.current !== 'edgeHover') return;
      if (getElapsed() >= HOVER_INTENTION_DELAY && getMouseSpeed() < MAX_MOUSE_SPEED_FOR_MAGNETIC) {
        clearIntentTimeout();
        setState('magneticFollow');
        return;
      }
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [state, canHover, getElapsed, getMouseSpeed, clearIntentTimeout]);

  // Peek de primeira visita: aparece sozinho uma vez por sessão (só desktop).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!canHover) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      if (sessionStorage.getItem('sidebar-peek-v1')) return;
    } catch {
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout>;
    const showTimer = setTimeout(() => {
      if (stateRef.current !== 'idle') return;
      try {
        sessionStorage.setItem('sidebar-peek-v1', '1');
      } catch {
        /* sessionStorage bloqueado */
      }
      setExactPosition(window.innerHeight / 2 - FLOATING_MENU_HEIGHT / 2);
      setState('edgeHover');
      hideTimer = setTimeout(() => {
        if (stateRef.current === 'edgeHover') {
          stopAnimation();
          setState('idle');
        }
      }, 1200);
    }, 2600);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [canHover, setExactPosition, stopAnimation]);

  useEffect(() => {
    return () => {
      clearIntentTimeout();
      clearGraceTimeout();
      stopAnimation();
    };
  }, [clearGraceTimeout, clearIntentTimeout, stopAnimation]);

  const isMenuVisible = state === 'edgeHover' || state === 'magneticFollow';

  return (
    <div className="fadeable pointer-events-none">
      {canHover && (
        <EdgeZone
          ref={edgeZoneRef}
          onMouseEnter={handleMouseEnterEdgeZone}
          onMouseLeave={handleMouseLeaveEdgeZone}
        >
          <PeekTab
            visible={state !== 'expanding' && state !== 'fullscreen'}
            onClick={handleOpenMenu}
          />
        </EdgeZone>
      )}

      {!canHover && (
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={handleOpenMenu}
          className="pointer-events-auto fixed top-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/80 backdrop-blur-md transition-colors hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="flex h-5 w-6 flex-col justify-between" aria-hidden="true">
            <span className="h-0.5 w-full bg-white" />
            <span className="h-0.5 w-full bg-white" />
            <span className="h-0.5 w-full bg-white" />
          </span>
        </button>
      )}

      {canHover && (
        <div
          ref={floatingMenuRef}
          className="fixed top-0 right-0 z-40 pointer-events-none"
          style={{ width: FLOATING_AREA_WIDTH, height: '100dvh' }}
          onMouseLeave={scheduleIdle}
        >
          <FloatingMenu
            magneticY={magneticY}
            onClick={handleMenuClick}
            isVisible={isMenuVisible}
            onMouseEnter={clearGraceTimeout}
          />
        </div>
      )}

      {state === 'expanding' && <ExpandingMenu magneticY={expandY} />}
      {state === 'fullscreen' && <FullscreenMenu onClose={handleClose} />}
    </div>
  );
};

export default Sidebar;
