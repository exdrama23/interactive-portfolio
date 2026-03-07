export default function SecaoSobre() {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-[#141414] text-white">
      <h2 className="text-2xl font-bold mb-6">Meus Commits Reais</h2>
      
      {/* O container Glassmorphism */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm w-full max-w-4xl flex justify-center">
        
        {/* A Mágica: A imagem do Snake SVG */}
        <img 
          // O link vai puxar o SVG gerado pelo seu próprio GitHub
          src="https://raw.githubusercontent.com/exdrama23/exdrama23/output/github-contribution-grid-snake.svg" 
          alt="Snake comendo meus commits do GitHub"
          className="w-full h-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        />
        
      </div>
    </div>
  );
}