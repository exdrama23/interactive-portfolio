import React from 'react';
import type { MenuState } from './types';

interface DebugInfoProps {
  state: MenuState;
  mouseSpeed: number;
  magneticY: number;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ state, mouseSpeed, magneticY }) => (
  <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded text-xs font-mono z-50">
    <div>State: {state}</div>
    <div>Mouse Speed: {mouseSpeed.toFixed(2)}px/ms</div>
    <div>Magnetic Y: {Math.round(magneticY)}px</div>
  </div>
);

export default DebugInfo;