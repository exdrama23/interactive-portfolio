import React, { useMemo } from 'react';
import type { FullscreenMenuProps } from './types';
import { demoItems, SOCIAL_LINKS } from './constants';

const FullscreenMenu: React.FC<FullscreenMenuProps> = ({ onClose }) => {
  const renderNavItems = useMemo(() =>
    demoItems.map((item, index) => (
      <a
        key={index}
        href={item.link}
        onClick={onClose}
        className="block group menu-item-in"
        style={{ animationDelay: `${index * 80 + 150}ms` }}>
        <div className="flex items-center">
          <div className="w-8 h-0.5 bg-white dark:bg-zinc-700 mr-6 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-3xl md:text-5xl font-serif font-light tracking-tight text-white/90 dark:text-zinc-800 group-hover:text-white dark:group-hover:text-black transition-colors">
            {item.text}
          </div>
        </div>
      </a>
    )), [onClose]);

  const renderSocialLinks = useMemo(() =>
    SOCIAL_LINKS.map(social => (
      <a key={social.id} href={social.href} className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-black transition-colors text-lg">
        {social.label}
      </a>
    )), []);

  return (
    <div className="fixed inset-0 bg-black dark:bg-white z-50 flex">
      <div className="w-[140px] h-full bg-black dark:bg-white flex items-center justify-center">
        <div className="h-3/4 rounded-l-[140px] w-full bg-black dark:bg-white border-r border-white/10 dark:border-black/10" />
      </div>
      <div className="flex-1 flex flex-col p-8 md:p-12">
        <div className="flex justify-between items-start mb-8 md:mb-12">
          <div className="font-mono text-2xl font-bold tracking-tight text-white dark:text-black">
            <div>PORTFÓLIO</div>
            <div className="text-gray-400 dark:text-gray-600 mt-1">PESSOAL</div>
          </div>
          <button onClick={onClose} className="text-5xl text-white/80 dark:text-zinc-600 hover:text-white dark:hover:text-black transition-colors" aria-label="Fechar menu">×</button>
        </div>
        <nav className="space-y-2 md:space-y-4 flex-1 overflow-y-auto pr-2">{renderNavItems}</nav>
        <div className="flex justify-between items-end pt-8 md:pt-12 border-t border-gray-700 dark:border-gray-300">
          <div className="space-y-6">
            <div className="flex gap-8">{renderSocialLinks}</div>
            <a href="https://" className="inline-block text-gray-500 dark:text-gray-500 hover:text-white dark:hover:text-black transition-colors text-sm border-b border-gray-600 dark:border-gray-400 hover:border-white dark:hover:border-black pb-1">
              https://
            </a>
          </div>
          <div className="text-right max-w-xs text-gray-500 text-sm leading-relaxed">
            Desenvolvido com React, TypeScript e Tailwind CSS.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenMenu;