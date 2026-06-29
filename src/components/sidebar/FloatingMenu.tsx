import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExtendedFloatingMenuProps } from './types';
import { FLOATING_MENU_HEIGHT, FLOATING_MENU_WIDTH } from './constants';

const FloatingMenu: React.FC<ExtendedFloatingMenuProps> = ({ 
  magneticY,
  onClick,
  isVisible,
  onMouseEnter,
  onMouseLeave
}) => {
  const curvedPath = "M 100 -110 L 100 210 Q 10 50 100 -110 Z";
  const flatPath = "M 100 -110 L 100 210 Q 100 50 100 -110 Z";


  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="floating-menu"
          
          onClick={onClick}
          onMouseEnter={onMouseEnter} 
          onMouseLeave={onMouseLeave}
          
          className="absolute right-0 group" 
          
          initial={{ x: '100%', opacity: 0 }}
          animate={{ 
            x: 0, 
            opacity: 1, 
            y: magneticY,
            transition: { type: 'spring', stiffness: 700, damping: 30, mass: 0.4 }
          }}
          exit={{ 
            x: '100%', 
            opacity: 0,
            transition: { duration: 0.15, ease: "easeIn" } 
          }}

          style={{
            top: 0,
            height: FLOATING_MENU_HEIGHT,
            width: FLOATING_MENU_WIDTH,
            willChange: 'transform',
            filter: 'drop-shadow(-5px 0px 15px rgba(0,0,0,0.15))',
            right: undefined,
            pointerEvents: 'auto', 
            cursor: 'pointer'
          }}>
          <div className="relative w-full h-full">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full overflow-visible origin-right"
              preserveAspectRatio="none">
              <motion.path
                initial={{ d: flatPath }}
                animate={{ 
                  d: curvedPath,
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
                exit={{ 
                  d: flatPath,
                  transition: { duration: 0.15, ease: "easeIn" } 
                }}
                fill={"#191919"} className="dark:fill-[#e6e6e6]"
                vectorEffect="non-scaling-stroke"/>
            </svg>

            <motion.div 
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              className="absolute inset-0 flex items-center justify-end pr-6 pl-4">
              <button className="relative w-10 h-10 rounded-full flex items-center justify-end bg-transparent pointer-events-none">
                <div className="relative w-6 h-5 flex flex-col justify-between">
                  <span className="w-full h-0.5 bg-white dark:bg-zinc-800 transition-all duration-300 group-hover:w-1/2 self-end" />
                  <span className="w-full h-0.5 bg-white dark:bg-zinc-800 transition-all duration-300" />
                  <span className="w-full h-0.5 bg-white dark:bg-zinc-800 transition-all duration-300 group-hover:w-1/2 self-end" />
                </div>
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingMenu;