// import { FlowingSidebar } from '../components/Header';
import Header from '../components/Header';
import HeroPortal from '../components/HeroPortal';
import Sidebar from '../components/Sidebar';
import Contato from '../components/Contato';
import Tecnologias from '../pages/tecnologias';

export function Index() {
  return (
    <div className="w-full">
      <Header />
      <main className="relative z-10">
        <HeroPortal />
        <Tecnologias />
        <Contato />
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
