// import React, { useState, useCallback, useEffect } from 'react';
// import type { MenuState } from './headers/types';
// import { useMouseMovement } from './headers/useMouseMovement';
// import { useMagneticPosition } from './headers/useMagneticPosition';
// import { 
//   FLOATING_MENU_HEIGHT, 
//   FLOATING_MENU_WIDTH,
//   EDGE_ZONE_WIDTH,
//   MAX_MOUSE_SPEED_FOR_MAGNETIC, 
//   HOVER_INTENTION_DELAY, 
//   EXPAND_ANIMATION_DURATION 
// } from './headers/constants';
// import EdgeZone from './headers/EdgeZone';
// import FloatingMenu from './headers/FloatingMenu';
// import ExpandingMenu from './headers/ExpandingMenu';
// import FullscreenMenu from './headers/FullscreenMenu';
// import DebugInfo from './headers/DebugInfo';

// const EdgeMenu: React.FC = () => {
//   const [state, setState] = useState<MenuState>('idle');
//   const stateRef = React.useRef(state);
//   const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
//   const { updateMousePosition, startMouseTracking, getMouseSpeed } = useMouseMovement();
//   const { magneticY, updateMagneticPosition, setExactPosition, startAnimation, stopAnimation } = 
//     useMagneticPosition(0);

//   const handleMouseMove = useCallback((e: MouseEvent) => {
//     updateMousePosition(e.clientY);
    
//     // Update magnetic position on both edgeHover and magneticFollow
//     if (stateRef.current === 'magneticFollow' || stateRef.current === 'edgeHover') {
//       const targetY = e.clientY - (FLOATING_MENU_HEIGHT / 2);
//       updateMagneticPosition(targetY);
//     }
//   }, [updateMousePosition, updateMagneticPosition]);

//   const handleMouseEnter = useCallback((e: React.MouseEvent) => {
//     console.log('EdgeZone entered at Y:', e.clientY, 'Current state:', stateRef.current);
//     startMouseTracking(e.clientY);
    
//     if (stateRef.current === 'idle') {
//       console.log('Switching to edgeHover');
//       setState('edgeHover');
//       setExactPosition(e.clientY - (FLOATING_MENU_HEIGHT / 2));

//       // Clear previous timeout
//       if (hoverTimeoutRef.current) {
//         clearTimeout(hoverTimeoutRef.current);
//       }

//       // Set new timeout to check for magnetic follow
//       hoverTimeoutRef.current = setTimeout(() => {
//         console.log('Hover timeout - current state:', stateRef.current, 'mouse speed:', getMouseSpeed());
//         if (stateRef.current === 'edgeHover' && getMouseSpeed() < MAX_MOUSE_SPEED_FOR_MAGNETIC) {
//           console.log('Switching to magneticFollow');
//           setState('magneticFollow');
//         }
//       }, HOVER_INTENTION_DELAY);
//     }
//   }, [startMouseTracking, setExactPosition, getMouseSpeed]);

//   const handleMouseLeave = useCallback(() => {
//     console.log('EdgeZone left - current state:', stateRef.current);
//     if (hoverTimeoutRef.current) {
//       clearTimeout(hoverTimeoutRef.current);
//       hoverTimeoutRef.current = null;
//     }
//     if (stateRef.current === 'edgeHover' || stateRef.current === 'magneticFollow') {
//       console.log('Switching back to idle');
//       setState('idle');
//     }
//   }, []);

//   const handleMenuClick = useCallback(() => {
//     console.log('Menu clicked - current state:', stateRef.current);
//     if (stateRef.current === 'magneticFollow' || stateRef.current === 'edgeHover') {
//       console.log('Switching to expanding');
//       setState('expanding');
      
//       setTimeout(() => {
//         setState('fullscreen');
//       }, EXPAND_ANIMATION_DURATION);
//     }
//   }, []);

//   const handleClose = useCallback(() => {
//     console.log('Menu closed');
//     setState('idle');
//   }, []);

//   useEffect(() => {
//     stateRef.current = state;
//     console.log('State changed to:', state);
//   }, [state]);

//   useEffect(() => {
//     if (state === 'magneticFollow' || state === 'edgeHover') {
//       const handleMouseMoveEvent = (e: MouseEvent) => handleMouseMove(e);
//       window.addEventListener('mousemove', handleMouseMoveEvent, { passive: true });
//       startAnimation();
//       return () => {
//         window.removeEventListener('mousemove', handleMouseMoveEvent);
//       };
//     } else {
//       stopAnimation();
//     }
//   }, [state, handleMouseMove, startAnimation, stopAnimation]);

//   useEffect(() => {
//     return () => {
//       if (hoverTimeoutRef.current) {
//         clearTimeout(hoverTimeoutRef.current);
//       }
//       stopAnimation();
//     };
//   }, [stopAnimation]);

//   const shouldShowFloatingMenu = state === 'edgeHover' || state === 'magneticFollow';
//   const sidebarStripWidth = EDGE_ZONE_WIDTH + FLOATING_MENU_WIDTH;

//   return (
//     <>

//       <EdgeZone
//         onMouseEnter={handleMouseEnter}
//         onMouseLeave={state !== 'idle' ? handleMouseLeave : undefined}
//       />

//       {shouldShowFloatingMenu && (
//         <div
//           className="fixed top-0 right-0 h-screen z-40"
//           style={{ width: sidebarStripWidth }}
//           onMouseLeave={handleMouseLeave}
//           onClick={handleMenuClick}
//         >
//           <FloatingMenu
//             magneticY={magneticY}
//             onClick={handleMenuClick}
//           />
//         </div>
//       )}

//       {state === 'expanding' && (
//         <ExpandingMenu magneticY={magneticY} />
//       )}

//       {state === 'fullscreen' && (
//         <FullscreenMenu onClose={handleClose} />
//       )}

//       {import.meta.env.DEV && (
//         <DebugInfo
//           state={state}
//           mouseSpeed={getMouseSpeed()}
//           magneticY={magneticY}
//         />
//       )}
//     </>
//   );
// };

// export default EdgeMenu;