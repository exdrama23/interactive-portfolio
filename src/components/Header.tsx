import React, { useState, useEffect } from "react";
import { 
  Home, 
  User, 
  Cpu, 
  GraduationCap, 
  Award, 
  Briefcase, 
  Menu,
  Grid 
} from "lucide-react";

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({ width: 0 });
  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth });
    }
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      handleResize();
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);
  return windowSize;
};

const NavButton = ({ 
  icon, 
  label, 
  href, 
  active = false 
}: { 
  icon: React.ReactNode, 
  label: string, 
  href: string, 
  active?: boolean 
}) => (
    <a 
      href={href}
      className={`
        flex flex-col items-center justify-center gap-1 w-20 h-14 rounded-xl transition-all duration-300 group cursor-pointer
        ${active ? 'bg-white/10 dark:bg-black/10 text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-200 dark:hover:text-zinc-700 hover:bg-white/5 dark:hover:bg-black/5'}
      `}
    >
        <div className={`transition-transform duration-300 ${active ? '-translate-y-1' : 'group-hover:-translate-y-1'} flex justify-center w-full`}>
            {React.isValidElement(icon) 
              ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) 
              : icon}
        </div>
        <span className="text-[9px] font-medium tracking-wide uppercase opacity-80 text-center leading-none w-full">
            {label}
        </span>
        {active && (
            <span className="w-1 h-1 rounded-full bg-blue-500 absolute bottom-2 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        )}
    </a>
);

export default function OrganicHeader() {
  const { width } = useWindowSize();
  
  // Constantes de tamanho reduzidas
  const SIDE_HEIGHT = 48; 
  const CENTER_HEIGHT = 75; 
  const CENTER_WIDTH = 550; 
  const CURVE_WIDTH = 45; 
  
  if (width === 0) return null;

  const halfScreen = width / 2;
  const halfCenter = CENTER_WIDTH / 2;
  
  const curveStartLeft = halfScreen - halfCenter - CURVE_WIDTH;
  const curveEndLeft = halfScreen - halfCenter;
  const curveStartRight = halfScreen + halfCenter;
  const curveEndRight = halfScreen + halfCenter + CURVE_WIDTH;

  const path = `
    M 0 0 
    L ${width} 0 
    L ${width} ${SIDE_HEIGHT} 
    L ${curveEndRight} ${SIDE_HEIGHT} 
    C ${curveEndRight - CURVE_WIDTH / 2} ${SIDE_HEIGHT}, ${curveStartRight + CURVE_WIDTH / 2} ${CENTER_HEIGHT}, ${curveStartRight} ${CENTER_HEIGHT}
    L ${curveEndLeft} ${CENTER_HEIGHT}
    C ${curveEndLeft - CURVE_WIDTH / 2} ${CENTER_HEIGHT}, ${curveStartLeft + CURVE_WIDTH / 2} ${SIDE_HEIGHT}, ${curveStartLeft} ${SIDE_HEIGHT}
    L 0 ${SIDE_HEIGHT} 
    Z
  `;

  return (
    <div className="fadeable fixed top-0 left-0 w-full z-50 flex justify-center text-white dark:text-zinc-900 drop-shadow-2xl group">
      
      {/* Wrapper do SVG ajustado dinamicamente */}
      <div 
        className="absolute top-0 left-0 w-full pointer-events-none overflow-visible"
        style={{ height: CENTER_HEIGHT + 20 }}
      >
        <svg
          width={width}
          height={CENTER_HEIGHT + 20}
          viewBox={`0 0 ${width} ${CENTER_HEIGHT + 20}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glass-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="rgba(0,0,0,0.5)" />
            </filter>
            
            <linearGradient id="glass-gradient-light" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(20, 20, 20, 0.95)" />
              <stop offset="100%" stopColor="rgba(20, 20, 20, 0.85)" />
            </linearGradient>

            <linearGradient id="glass-gradient-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.85)" />
            </linearGradient>

            <linearGradient id="vermilion-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b30000" />
              <stop offset="50%" stopColor="#800000" />
              <stop offset="100%" stopColor="#4d0000" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={path}
            fill="url(#glass-gradient-light)"
            filter="url(#glass-shadow)"
            className="backdrop-blur-xl dark:hidden"
          />
          <path
            d={path}
            fill="url(#glass-gradient-dark)"
            filter="url(#glass-shadow)"
            className="backdrop-blur-xl hidden dark:block"
          />

          <path
            d={path}
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="0 5"
            fill="none"
            pathLength="100"
            className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />

          <path
            d={path}
            stroke="url(#vermilion-gradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            style={{ filter: 'url(#glow)' }}
            className="snake-game-animation"
            pathLength="100"
          />
        </svg>
      </div>

      <div 
        className="relative w-full flex justify-center items-start px-8"
        style={{ height: CENTER_HEIGHT }}
      >
        <div 
            className="flex items-center justify-center gap-1"
            style={{ 
                height: CENTER_HEIGHT, 
                width: CENTER_WIDTH,
                marginTop: -2 
            }}
        >
            <NavButton icon={<Home />} label="Início" href="#inicio" active />
            <NavButton icon={<User />} label="Sobre" href="#sobre" />
            <NavButton icon={<Cpu />} label="Hard-Skills" href="#skills" />
            <NavButton icon={<GraduationCap />} label="Formações" href="#formacao" />
            <NavButton icon={<Award />} label="Certificações" href="#certificacoes" />
            <NavButton icon={<Briefcase />} label="Projetos" href="#projetos" />
        </div>

        {/* Botão hamburguer alinhado com a nova altura lateral */}
        <div 
          className="fixed top-0 right-8 flex items-center gap-4"
          style={{ height: SIDE_HEIGHT }}
        >
           <button className="md:hidden p-2 text-zinc-300 dark:text-zinc-600 hover:text-white dark:hover:text-zinc-900">
             <Menu size={20} />
           </button>
        </div>

      </div>
    </div>
  );
}