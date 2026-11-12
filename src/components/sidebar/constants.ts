import type { MenuItemData, SocialLink } from './types';

export const FLOATING_MENU_HEIGHT = 200;
export const FLOATING_MENU_WIDTH = 120;
export const EDGE_ZONE_WIDTH = 30;
export const MAX_MOUSE_SPEED_FOR_MAGNETIC = 5.0;
export const HOVER_INTENTION_DELAY = 10;
export const EXPAND_ANIMATION_DURATION = 200;
export const FADE_IN_DURATION = 300;
export const MAGNETIC_SMOOTHING_FACTOR = 0.35;

export const demoItems: MenuItemData[] = [
  { link: '#inicio', text: 'Início' },
  { link: '#sobre', text: 'Sobre' },
  { link: '#skills', text: 'Hard-Skills' },
  { link: '#formacao', text: 'Formações' },
  { link: '#certificacoes', text: 'Certificações' },
  { link: '#projetos', text: 'Projetos' },
  { link: '#contato', text: 'Contato' },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'facebook', label: 'Facebook', href: '#' },
  { id: 'instagram', label: 'Instagram', href: '#' },
  { id: 'twitter', label: 'Twitter', href: '#' },
];