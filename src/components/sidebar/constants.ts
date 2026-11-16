import type { MenuItemData, SocialLink } from './types';

export const FLOATING_MENU_HEIGHT = 200;
export const FLOATING_MENU_WIDTH = 120;
export const EDGE_ZONE_WIDTH = 30;
/** Largura da área que mantém o blob "vivo" enquanto o cursor está sobre ele. */
export const FLOATING_AREA_WIDTH = 140;
export const MAX_MOUSE_SPEED_FOR_MAGNETIC = 5.0;
export const HOVER_INTENTION_DELAY = 10;
export const EXPAND_ANIMATION_DURATION = 200;
export const FADE_IN_DURATION = 300;
/**
 * Constante de tempo (ms) do "grude" magnético.
 * Antes era um lerp fixo por frame (0.35), então a velocidade real mudava com
 * a taxa de quadros do monitor. Com tau fixo em ms, 30fps e 144Hz se movem igual.
 * Menor = mais seco, maior = mais "borrachudo".
 */
export const MAGNETIC_TAU_MS = 65;
export const MAGNETIC_SMOOTHING_FACTOR = 0.35;
/** Tolerância (ms) para o cursor sair da faixa e voltar sem o blob sumir. */
export const BLOB_GRACE_MS = 160;

export const demoItems: MenuItemData[] = [
  { link: '/#inicio', text: 'Início' },
  { link: '/#sobre', text: 'Sobre' },
  { link: '/#skills', text: 'Hard-Skills' },
  { link: '/#formacao', text: 'Formações' },
  { link: '/#certificacoes', text: 'Certificações' },
  { link: '/#projetos', text: 'Projetos' },
  { link: '/projetos', text: 'Todos os projetos', highlight: true },
  { link: '/#contato', text: 'Contato' },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'facebook', label: 'Facebook', href: '#' },
  { id: 'instagram', label: 'Instagram', href: '#' },
  { id: 'twitter', label: 'Twitter', href: '#' },
];
