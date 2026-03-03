import { forwardRef } from 'react';
import type { EdgeZoneProps } from './types';
import { EDGE_ZONE_WIDTH } from './constants';

const EdgeZone = forwardRef<HTMLDivElement, EdgeZoneProps>(
  ({ onMouseEnter, onMouseLeave }, ref) => (
    <div
      ref={ref}
      className="fixed top-0 right-0 h-screen z-30"
      style={{ width: EDGE_ZONE_WIDTH }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  )
);

export default EdgeZone;