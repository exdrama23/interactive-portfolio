export type MenuState = 'idle' | 'edgeHover' | 'magneticFollow' | 'expanding' | 'fullscreen';

export interface MenuItemData {
  link: string;
  text: string;
}

export interface FlowingMenuProps {
  items?: MenuItemData[];
  speed?: number;
  isOpen: boolean;
}

export interface MenuItemProps extends MenuItemData {
  speed: number;
  isFirst: boolean;
}

export interface FloatingMenuProps {
  magneticY: number;
  onClick: () => void;
}

export interface ExpandingMenuProps {
  magneticY: number;
}

export interface FullscreenMenuProps {
  onClose: () => void;
}

export interface EdgeZoneProps {
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

export interface ExtendedFloatingMenuProps extends FloatingMenuProps {
  isVisible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
}