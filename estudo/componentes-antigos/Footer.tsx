import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import binary from '../assets/img/Binary Code.jfif';

interface MenuItemData {
  link: string;
  text: string;
  image: string;
}

interface FlowingMenuProps {
  items?: MenuItemData[];
  speed?: number;
  isOpen: boolean;
}

interface MenuItemProps extends MenuItemData {
  speed: number;
  isFirst: boolean;
}

const MenuToggle: React.FC<{ onClick: () => void; isOpen: boolean }> = ({ onClick, isOpen }) => (
  <button
    onClick={onClick}
    className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full flex items-center justify-center bg-black shadow-xl transition-all duration-300 hover:scale-105"
  >
    <div className="relative w-6 h-7">
      <span 
        className={`absolute left-0 w-full h-0.5 bg-white transition-all duration-500 ease-in-out ${
          isOpen ? 'top-3.5 rotate-45' : 'top-2'
        }`} 
      />
      <span 
        className={`absolute left-0 w-full h-0.5 bg-white transition-all duration-500 ease-in-out ${
          isOpen ? 'top-3.5 -rotate-45 opacity-100' : 'top-3.5 opacity-100'
        }`} 
      />
      <span 
        className={`absolute left-0 w-full h-0.5 bg-white transition-all duration-500 ease-in-out ${
          isOpen ? 'top-3.5 opacity-0' : 'top-5'
        }`} 
      />
    </div>
  </button>
);

const FlowingMenu: React.FC<FlowingMenuProps> = ({
  items = [],
  speed = 10,
  isOpen
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      if (isOpen) {
        gsap.fromTo(containerRef.current,
          {
            x: -256,
            opacity: 0,
            scaleX: 0.9,
            scaleY: 1,
            borderRadius: '40px 0 0 40px',
          },
          {
            x: 0,
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
            borderRadius: '0',
            duration: 0.8,
            ease: "power3.out",
            overwrite: "auto"
          }
        );
      } else {
        gsap.to(containerRef.current, {
          x: -256,
          opacity: 0,
          scaleX: 0.9,
          borderRadius: '40px 0 0 40px',
          duration: 0.6,
          ease: "power3.inOut",
          overwrite: "auto"
        });
      }
    }
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="fixed left-0 top-0 h-screen w-64 z-40 overflow-hidden bg-black border-r border-white/10 backdrop-blur-sm"
      style={{ 
        transformOrigin: 'left center',
        boxShadow: '4px 0 30px rgba(0,0,0,0.2)',
        opacity: 0,
        x: -256
      }}
    >
      <nav className="flex flex-col h-full m-0 p-0">
        {items.map((item, idx) => (
          <MenuItem
            key={idx}
            {...item}
            speed={speed}
            isFirst={idx === 0}
          />
        ))}
      </nav>
    </div>
  );
};

const MenuItem: React.FC<MenuItemProps> = ({link, text, image, speed, isFirst}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const [repetitions, setRepetitions] = useState(2);

  const animationDefaults = { 
    duration: 0.5, 
    ease: 'power2.inOut' 
  };

  const findClosestEdge = (mouseX: number, mouseY: number, width: number, height: number): 'top' | 'bottom' => {
    const topEdgeDist = Math.pow(mouseX - width / 2, 2) + Math.pow(mouseY, 2);
    const bottomEdgeDist = Math.pow(mouseX - width / 2, 2) + Math.pow(mouseY - height, 2);
    return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
  };

  useEffect(() => {
    const calculateRepetitions = () => {
      if (!marqueeInnerRef.current) return;
      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee-part') as HTMLElement;
      if (!marqueeContent) return;
      const contentWidth = marqueeContent.offsetWidth;
      const viewportWidth = window.innerWidth;
      const needed = Math.ceil(viewportWidth / contentWidth) + 1;
      setRepetitions(Math.max(2, needed));
    };

    calculateRepetitions();
    window.addEventListener('resize', calculateRepetitions);
    return () => window.removeEventListener('resize', calculateRepetitions);
  }, [text, image]);

  useEffect(() => {
    const setupMarquee = () => {
      if (!marqueeInnerRef.current) return;
      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee-part') as HTMLElement;
      if (!marqueeContent) return;
      const contentWidth = marqueeContent.offsetWidth;
      if (contentWidth === 0) return;

      if (animationRef.current) {
        animationRef.current.kill();
      }

      animationRef.current = gsap.to(marqueeInnerRef.current, {
        x: -contentWidth,
        duration: speed,
        ease: 'none',
        repeat: -1
      });
    };

    const timer = setTimeout(setupMarquee, 50);
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [text, image, repetitions, speed]);

  const handleMouseEnter = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const edge = findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);

    gsap
      .timeline({ defaults: animationDefaults })
      .set(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: '0%' }, 0);
  };

  const handleMouseLeave = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const edge = findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);

    gsap
      .timeline({ defaults: animationDefaults })
      .to(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0);
  };

  return (
    <div
      className="flex-1 relative overflow-hidden text-center group"
      ref={itemRef}
      style={{ borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
      <a
        className="flex items-center justify-center h-full relative cursor-pointer uppercase no-underline font-medium text-[2.2vh] px-6 text-white transition-all duration-300 hover:text-white/90 hover:pl-8"
        href={link}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        {text}
        <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </a>
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none translate-y-[101%] bg-white"
        ref={marqueeRef}>
        <div className="h-full w-fit flex" ref={marqueeInnerRef}>
          {[...Array(repetitions)].map((_, idx) => (
            <div className="marquee-part flex items-center shrink-0" key={idx}>
              <span className="whitespace-nowrap uppercase font-medium text-[2.2vh] leading-none px-[1vw] text-black">
                {text}
              </span>
              <div
                className="w-32 h-[4.5vh] my-[1em] mx-[1vw] rounded-[30px] bg-cover bg-center border-2 border-black/10"
                style={{ backgroundImage: `url(${image})` }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const FlowingSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const demoItems = [
    { link: '#', text: 'Home', image: binary },
    { link: '#', text: 'Sobre', image: binary },
    { link: '#', text: 'Soft-skills', image: binary },
    { link: '#', text: 'Hard-skills', image: binary },
    { link: '#', text: 'Formações', image: binary },
    { link: '#', text: 'Certificaçõe', image: binary },
    { link: '#', text: 'Contato', image: binary }
  ];

  return (
    <>
      <MenuToggle 
        onClick={() => setIsOpen(!isOpen)} 
        isOpen={isOpen} 
      />
      
      <FlowingMenu
        items={demoItems}
        speed={18}
        isOpen={isOpen}
      />
    </>
  );
};

export default FlowingMenu;