import React from 'react';
import type { ExpandingMenuProps } from './types';
import { FLOATING_MENU_HEIGHT, FLOATING_MENU_WIDTH } from './constants';

const ExpandingMenu: React.FC<ExpandingMenuProps> = ({ magneticY }) => {
  const circleCenterX = `calc(100% - ${FLOATING_MENU_WIDTH / 2}px)`;
  const circleCenterY = `${magneticY + FLOATING_MENU_HEIGHT / 2}px`;
  
  return (
    <div
      className="fixed inset-0 z-40"
      style={{
        clipPath: `circle(0% at ${circleCenterX} ${circleCenterY})`,
        animation: 'expand 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      }}>
      <style>{`
        @keyframes expand {
          0% {
            clip-path: circle(0% at ${circleCenterX} ${circleCenterY});
          }
          100% {
            clip-path: circle(150% at ${circleCenterX} ${circleCenterY});
          }
        }
      `}</style>
      <div className="h-full w-full bg-black" />
    </div>
  );
};

export default ExpandingMenu;