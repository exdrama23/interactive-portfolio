// import { FlowingSidebar } from '../components/Header';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import HeroPortal from '../components/HeroPortal';
import Sidebar from '../components/Sidebar';
import Contato from '../components/Contato';
import Tecnologias from '../pages/tecnologias';
import Formacao from '../pages/formacao';
import Projetos from '../pages/projetos';
import { TidelineCta } from '../components/ui/tideline-cta';
import { IntroOverlay } from '../components/ui/introducao';
import FOOTER from '../data/footer.json';

// A introdução é só da PRIMEIRA carga completa da página. Trocar de rota
// dentro do SPA (ou remontar a home) não a repete; um F5/reload repete.
let introPlayedThisLoad = false;

export function Index() {
  // A introdução cobre a home no primeiro carregamento. Quem pediu menos
  // movimento já começa com ela fora (o overlay também respeita isso).
  const motionAllowed = () =>
    typeof window === 'undefined' ||
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [introActive, setIntroActive] = useState(
    () => motionAllowed() && !introPlayedThisLoad
  );
  // A home só é montada quando o fade final começa: durante a animação não há
  // motivo para manter hero, canvas e seções inteiras renderizados por baixo.
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
        <Tecnologias />
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
      {/* <section className="h-screen flex flex-col items-center justify-center px-6 text-center">
        <ParticleText />
      </section> */}

      {/* <section className="py-32 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent relative overflow-hidden">
        
      </section> */}
      <Sidebar />
      </main>
      )}

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
