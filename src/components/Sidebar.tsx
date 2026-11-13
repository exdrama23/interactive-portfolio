import { useState, useRef, useCallback, useEffect } from 'react';
import type { MenuState } from './sidebar/types';
import { 
  FLOATING_MENU_HEIGHT,
  HOVER_INTENTION_DELAY, 
  MAX_MOUSE_SPEED_FOR_MAGNETIC, 
  EXPAND_ANIMATION_DURATION,
} from './sidebar/constants';
import { useMouseMovement } from './sidebar/useMouseMovement';
import { useMagneticPosition } from './sidebar/useMagneticPosition';
import EdgeZone from './sidebar/EdgeZone';
import FloatingMenu from './sidebar/FloatingMenu';
import ExpandingMenu from './sidebar/ExpandingMenu';
import FullscreenMenu from './sidebar/FullscreenMenu';
// import FlowingMenu from './sidebar/FlowingMenu';

const Sidebar = () => {
  const [state, setState] = useState<MenuState>('idle');
  // const [isMenuOpen, setIsMenuOpen] = useState(false);
  const stateRef = useRef<MenuState>(state);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeZoneRef = useRef<HTMLDivElement>(null);
  const floatingMenuRef = useRef<HTMLDivElement>(null);

  const { updateMousePosition, startMouseTracking, getMouseSpeed } = useMouseMovement();
  const { magneticY, updateMagneticPosition, setExactPosition, startAnimation, stopAnimation } = useMagneticPosition(0);

  const resetHoverIntent = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    updateMousePosition(e.clientY);
    if (stateRef.current === 'magneticFollow' || stateRef.current === 'edgeHover') {
      const targetY = e.clientY - FLOATING_MENU_HEIGHT / 2;
      updateMagneticPosition(targetY);
    }
  }, [updateMousePosition, updateMagneticPosition]);

  const handleMouseEnterEdgeZone = useCallback((e: any) => {
    resetHoverIntent();
    startMouseTracking(e.clientY);
    
    if (stateRef.current === 'idle' || stateRef.current === 'fullscreen') {
      setState('edgeHover');
      setExactPosition(e.clientY - FLOATING_MENU_HEIGHT / 2);
      
      hoverTimeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'edgeHover' && getMouseSpeed() < MAX_MOUSE_SPEED_FOR_MAGNETIC) {
          setState('magneticFollow');
        }
      }, HOVER_INTENTION_DELAY);
    }
  }, [startMouseTracking, setExactPosition, getMouseSpeed, resetHoverIntent]);

  const handleMouseLeaveEdgeZone = useCallback(
  (e: any) => {
    const relatedTarget = e.relatedTarget;

    if (
      relatedTarget instanceof HTMLElement &&
      floatingMenuRef.current?.contains(relatedTarget)
    ) {
      return;
    }

    if (
      stateRef.current === 'edgeHover' ||
      stateRef.current === 'magneticFollow'
    ) {
      resetHoverIntent();
      stopAnimation();
      setState('idle');
    }
  },
  [resetHoverIntent, stopAnimation]
);


  const handleMouseLeaveFloatingArea = useCallback(() => {
    if (stateRef.current === 'edgeHover' || stateRef.current === 'magneticFollow') {
      resetHoverIntent();
      stopAnimation();
      setState('idle');
    }
  }, [resetHoverIntent, stopAnimation]);

  const handleMenuClick = useCallback(() => {
    if (stateRef.current === 'magneticFollow' || stateRef.current === 'edgeHover') {
      setState('expanding');
      setTimeout(() => setState('fullscreen'), EXPAND_ANIMATION_DURATION);
    }
  }, []);

  const handleClose = useCallback(() => {
    setState('idle');
    // setIsMenuOpen(false);
  }, []);

  const handleOpenMenu = useCallback(() => {
    setExactPosition(window.innerHeight / 2 - FLOATING_MENU_HEIGHT / 2);
    setState('expanding');
    setTimeout(() => setState('fullscreen'), EXPAND_ANIMATION_DURATION);
  }, [setExactPosition]);

  // const handleToggleMenu = useCallback(() => {
  //   setIsMenuOpen(!isMenuOpen);
  // }, [isMenuOpen]);

  useEffect(() => { 
    stateRef.current = state; 
  }, [state]);

  useEffect(() => {
    if (state === 'magneticFollow' || state === 'edgeHover') {
      const onMove = (e: MouseEvent) => handleMouseMove(e);
      window.addEventListener('mousemove', onMove, { passive: true });
      startAnimation();
      return () => window.removeEventListener('mousemove', onMove);
    } else {
      stopAnimation();
    }
  }, [state, handleMouseMove, startAnimation, stopAnimation]);

  useEffect(() => { 
    return () => { 
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); 
      stopAnimation(); 
    }; 
  }, [stopAnimation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
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
      } catch {}
      setExactPosition(window.innerHeight / 2 - FLOATING_MENU_HEIGHT / 2);
      setState('edgeHover');
      hideTimer = setTimeout(() => {
        if (stateRef.current === 'edgeHover') setState('idle');
      }, 1200);
    }, 2600);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [setExactPosition]);

  // const shouldShowFloatingMenu = state === 'edgeHover' || state === 'magneticFollow';
  // const sidebarStripWidth = EDGE_ZONE_WIDTH + FLOATING_MENU_WIDTH;
const isMenuVisible = state === 'edgeHover' || state === 'magneticFollow';
  return (
    <div className="fadeable">
      <EdgeZone 
        ref={edgeZoneRef}
        onMouseEnter={handleMouseEnterEdgeZone} 
        onMouseLeave={handleMouseLeaveEdgeZone}
      />

      <button
        type="button"
        aria-label="Abrir menu"
        onClick={handleOpenMenu}
        className="fixed top-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/80 backdrop-blur-md transition-colors hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
      >
        <span className="flex h-5 w-6 flex-col justify-between" aria-hidden="true">
          <span className="h-0.5 w-full bg-white" />
          <span className="h-0.5 w-full bg-white" />
          <span className="h-0.5 w-full bg-white" />
        </span>
      </button>
      
      {/* {shouldShowFloatingMenu && ( */}
         <div
          ref={floatingMenuRef}
          className="fixed top-0 right-0 h-screen z-40"
          // style={{ width: sidebarStripWidth }}
          onMouseLeave={handleMouseLeaveFloatingArea}
          onClick={handleMenuClick}
        >
          <FloatingMenu 
        magneticY={magneticY}
        onClick={handleMenuClick}
        isVisible={isMenuVisible} 
      />
        </div>
       {/* )} */}

      {/* Flowing Menu (first sidebar design) */}
      {/* <FlowingMenu items={demoItems} speed={18} isOpen={isMenuOpen}/> */}

      {state === 'expanding' && <ExpandingMenu magneticY={magneticY} />}
      {state === 'fullscreen' && <FullscreenMenu onClose={handleClose} />}

      {/* Botão de toggle fixo */}
      {/* <button
        onClick={handleToggleMenu}
        className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center bg-black shadow-xl transition-all duration-300 hover:scale-105 border border-white/10"
      >
        <div className="relative w-6 h-7">
          <span 
            className={`absolute left-0 w-full h-0.5 bg-white transition-all duration-500 ease-in-out ${
              isMenuOpen ? 'top-3.5 rotate-45' : 'top-2'
            }`} 
          />
          <span 
            className={`absolute left-0 w-full h-0.5 bg-white transition-all duration-500 ease-in-out ${
              isMenuOpen ? 'top-3.5 -rotate-45 opacity-100' : 'top-3.5 opacity-100'
            }`} 
          />
          <span 
            className={`absolute left-0 w-full h-0.5 bg-white transition-all duration-500 ease-in-out ${
              isMenuOpen ? 'top-3.5 opacity-0' : 'top-5'
            }`} 
          />
        </div>
      </button> */}

    </div>
  );
};

export default Sidebar;