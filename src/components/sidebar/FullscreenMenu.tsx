import React, { useMemo } from 'react';
import type { FullscreenMenuProps } from './types';
import { demoItems, SOCIAL_LINKS, FADE_IN_DURATION } from './constants';

const FullscreenMenu: React.FC<FullscreenMenuProps> = ({ onClose }) => {
  const renderNavItems = useMemo(() =>
    demoItems.map((item, index) => (
      <a
        key={index}
        href={item.link}
        className="block group opacity-0 animate-in slide-in-from-right-8"
        style={{ animationDelay: `${index * 100 + 300}ms`, animationFillMode: 'forwards' }}>
        <div className="flex items-center">
          <div className="w-8 h-0.5 bg-white mr-6 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-7xl font-serif font-light tracking-tight text-white/90 group-hover:text-white transition-colors">
            {item.text}
          </div>
        </div>
      </a>
    )), []);

  const renderSocialLinks = useMemo(() =>
    SOCIAL_LINKS.map(social => (
      <a key={social.id} href={social.href} className="text-gray-400 hover:text-white transition-colors text-lg">
        {social.label}
      </a>
    )), []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex animate-in fade-in duration-300" style={{ animationDuration: `${FADE_IN_DURATION}ms` }}>
      <div className="w-[140px] h-full bg-black flex items-center justify-center">
        <div className="h-3/4 rounded-l-[140px] w-full bg-black border-r border-white/10" />
      </div>
      <div className="flex-1 flex flex-col p-12">
        <div className="flex justify-between items-start mb-24">
          <div className="font-mono text-2xl font-bold tracking-tight text-white">
            <div>,,,,,,,</div>
            <div>,,,,,,,</div>
            <div className="text-gray-400 mt-1">,,,,,,,</div>
          </div>
          <button onClick={onClose} className="text-5xl text-white/80 hover:text-white transition-colors" aria-label="Close menu">×</button>
        </div>
        <nav className="space-y-6 flex-1">{renderNavItems}</nav>
        <div className="flex justify-between items-end pt-12 border-t border-gray-700">
          <div className="space-y-8">
            <div className="flex gap-8">{renderSocialLinks}</div>
            <a href="https://" className="inline-block text-gray-500 hover:text-white transition-colors text-sm border-b border-gray-600 hover:border-white pb-1">
              https://
            </a>
          </div>
          <div className="text-right max-w-xs text-gray-500 text-sm leading-relaxed">
            ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenMenu;