// import { FlowingSidebar } from '../components/Header';
// import { HeaderCards } from '../components/Header';
import ParticleText from '../components/ParticleText';
import Header from '../components/Sidebar2';

export function Index() {
  return (
    <div className="relative min-h-screen  bg-white">
      <div className="relative z-20">
  {/* <HeaderCards /> */}
</div>
      <div className="absolute inset-0 z-0">
        <ParticleText />
      </div>

      <Header />

      <main className="relative z-10 ml-20 p-5 text-white ">
        <div className="pointer-events-auto">
        </div>
      </main>
    </div>
  );
}

export default Index;
