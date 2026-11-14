// import { FlowingSidebar } from '../components/Header';
import Header from '../components/Header';
import HeroPortal from '../components/HeroPortal';
import Sidebar from '../components/Sidebar';
import Contato from '../components/Contato';
import Tecnologias from '../pages/tecnologias';
import Formacao from '../pages/formacao';
import Projetos from '../pages/projetos';
import { TidelineCta } from '../components/ui/tideline-cta';
import FOOTER from '../data/footer.json';

export function Index() {
  return (
    <div className="w-full">
      <main className="relative z-10">
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
    </div>
  );
}

export default Index;
