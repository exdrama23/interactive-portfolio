import { useEffect, useState } from 'react';
import HeroPortal from '../components/HeroPortal';
import Sidebar from '../components/Sidebar';
import Contato from '../components/Contato';
import Tecnologias from '../pages/tecnologias';
import { TechLevelProvider } from '@/components/ui/tecnologias/tech-level';
import Formacao from '../pages/formacao';
import Projetos from '../pages/projetos';
import { TidelineCta } from '../components/ui/tideline-cta';
import { IntroOverlay } from '../components/ui/introducao';
import FOOTER from '../data/footer.json';

let introPlayedThisLoad = false;

export function Index() {
  const motionAllowed = () =>
    typeof window === 'undefined' ||
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [introActive, setIntroActive] = useState(
    () => motionAllowed() && !introPlayedThisLoad
  );
  const [pageVisible, setPageVisible] = useState(
    () => !motionAllowed() || introPlayedThisLoad
  );

  useEffect(() => {
    introPlayedThisLoad = true;
  }, []);

  return (
    <div className="w-full">
      {pageVisible && (
      <main className="relative z-10" inert={introActive ? true : undefined}>
        <HeroPortal />
        <TechLevelProvider>
          <Tecnologias />
        </TechLevelProvider>
        <Formacao />
        <Projetos />
        <Contato />
        <TidelineCta
          eyebrow={FOOTER.eyebrow}
          headline={FOOTER.headline}
          sub={FOOTER.sub}
          level={FOOTER.level}
          taken={FOOTER.taken}
          action={FOOTER.action}
          href={FOOTER.href}
          details={FOOTER.details}
          theme="night"
        />
      </main>
      )}

      <Sidebar />

      {introActive && (
        <IntroOverlay
          onRevealStart={() => setPageVisible(true)}
          onComplete={() => setIntroActive(false)}
        />
      )}
    </div>
  );
}

export default Index;
