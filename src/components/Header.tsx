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
        flex flex-col items-center justify-center gap-1 w-24 h-16 rounded-xl transition-all duration-300 group cursor-pointer
        ${active ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}
      `}
    >
        <div className={`transition-transform duration-300 ${active ? '-translate-y-1' : 'group-hover:-translate-y-1'} flex justify-center w-full`}>
            {React.isValidElement(icon) 
              ? React.cloneElement(icon as React.ReactElement<any>, { size: 20 }) 
              : icon}
        </div>
        <span className="text-[10px] font-medium tracking-wide uppercase opacity-80 text-center leading-none w-full">
            {label}
        </span>
        {active && (
            <span className="w-1 h-1 rounded-full bg-blue-500 absolute bottom-3 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        )}
    </a>
);

export default function OrganicHeader() {
  const { width } = useWindowSize();
  
  const SIDE_HEIGHT = 64;
  const CENTER_HEIGHT = 100;
  const CENTER_WIDTH = 750;
  const CURVE_WIDTH = 60;
  
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
    <div className="fixed top-0 left-0 w-full z-50 flex justify-center text-white drop-shadow-2xl">

      <div className="absolute top-0 left-0 w-full h-[120px] pointer-events-none overflow-visible">
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
            
            <linearGradient id="glass-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(20, 20, 20, 0.95)" />
              <stop offset="100%" stopColor="rgba(20, 20, 20, 0.85)" />
            </linearGradient>
            
            <linearGradient id="border-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="20%" stopColor="rgba(255, 255, 255, 0.1)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.3)" />
              <stop offset="80%" stopColor="rgba(255, 255, 255, 0.1)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>

          <path
            d={path}
            fill="url(#glass-gradient)"
            filter="url(#glass-shadow)"
            className="backdrop-blur-xl" 
          />
          
          <path
            d={path}
            stroke="url(#border-gradient)"
            strokeWidth="1"
            fill="none"
            className="opacity-70"
          />
        </svg>
      </div>

      <div 
        className="relative w-full flex justify-between items-start px-8"
        style={{ height: CENTER_HEIGHT }}
      >

        <div className="flex items-center h-[64px] gap-6">
          <div className="font-bold text-xl tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black">
              <Grid size={18} />
            </div>
            Portfolio
          </div>
        </div>

        <div 
            className="flex items-center justify-center gap-1"
            style={{ 
                height: CENTER_HEIGHT, 
                width: CENTER_WIDTH,
                marginTop: -4 
            }}
        >
            <NavButton 
                icon={<Home />} 
                label="Início" 
                href="#inicio" 
                active 
            />
            <NavButton 
                icon={<User />} 
                label="Sobre" 
                href="#sobre" 
            />
            <NavButton 
                icon={<Cpu />} 
                label="Hard-Skills" 
                href="#skills" 
            />
            <NavButton 
                icon={<GraduationCap />} 
                label="Formações" 
                href="#formacao" 
            />
            <NavButton 
                icon={<Award />} 
                label="Certificações" 
                href="#certificacoes" 
            />
            <NavButton 
                icon={<Briefcase />} 
                label="Projetos" 
                href="#projetos" 
            />
        </div>

        <div className="flex items-center h-[64px] gap-4">
           <button className="md:hidden p-2 text-zinc-300 hover:text-white">
             <Menu />
           </button>
        </div>

      </div>
    </div>
  );
}