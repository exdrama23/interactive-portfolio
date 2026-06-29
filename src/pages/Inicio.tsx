import React from 'react';

export function Sobre() {
  return (
    <div className="min-h-screen w-full text-black p-8 md:p-16 font-sans flex flex-col justify-between pt-[140px] md:pt-[140px]">
      
      <div className="mb-24">
        <p className="text-[#a3a3a3] text-sm font-medium mb-2 tracking-wide">
          Business model
        </p>
        <h1 className="text-5xl md:text-[3.5rem] font-bold leading-tight tracking-tight max-w-3xl">
          We don't sell machines. We<br />unlock a new way to build.
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-16">
        
        <div className="hidden md:block md:col-span-4"></div>

        <div className="md:col-span-4 space-y-6 text-[15px] leading-relaxed text-[#c2c2c2]">
          <p className="text-white font-medium">
            ICOMAT eliminates compromise in composites production.
          </p>
          <p>
            We provide an end-to-end solution from structural design to finished composite parts.
          </p>
          <p>
            Our proprietary system unites design software, materials engineering, and automated production into one integrated process.
          </p>
          <p>
            It is tailored to the needs of each customer. We can supply preforms or finished parts and can set-up production lines near our clients for high-volume output.
          </p>
        </div>

        <div className="md:col-span-4 text-[15px] leading-relaxed">
          <p className="text-white font-medium mb-8">
            For our clients, this means:
          </p>
          
          <div className="space-y-8 text-[#8a8a8a]">
            <div>
              <p className="text-white font-semibold">No CapEx.</p>
              <p>Scale without upfront investment. We own the system. You receive the output.</p>
            </div>
            <div>
              <p className="text-white font-semibold">Fully integrated system.</p>
              <p>Software, machines, and production under one roof. No vendors. No handoffs. No risk.</p>
            </div>
            <div>
              <p className="text-white font-semibold">Scalable from day one.</p>
              <p>Expands from prototype to full scale production, rapidly and without limits.</p>
            </div>
          </div>
        </div>

        <div className="hidden md:block md:col-span-4"></div> 
        
        <div className="md:col-span-8 flex flex-col sm:flex-row gap-4 mt-8">
          <button className="flex-1 bg-[#171717] hover:bg-[#222] transition-colors text-[#666] text-xs font-bold tracking-widest py-5 px-6 rounded-md text-left uppercase border border-white/5">
            Others
          </button>
          
          <button className="flex-1 bg-gradient-to-b from-[#e5e5e5] to-[#a3a3a3] text-black text-xs font-bold tracking-widest py-5 px-6 rounded-md text-left uppercase">
            The Icomat Way
          </button>
        </div>

      </div>
    </div>
  );
}