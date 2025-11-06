import React from 'react';
import { motion } from 'framer-motion';

interface Company {
  name: string;
  logo: string;
}

const companies: Company[] = [
  { name: 'Acme Corp', logo: 'https://placehold.co/120x60/6366f1/ffffff?text=Acme+Corp' },
  { name: 'NextSoft', logo: 'https://placehold.co/120x60/8b5cf6/ffffff?text=NextSoft' },
  { name: 'Cloudify', logo: 'https://placehold.co/120x60/ec4899/ffffff?text=Cloudify' },
  { name: 'NovaLabs', logo: 'https://placehold.co/120x60/14b8a6/ffffff?text=NovaLabs' },
  { name: 'TechFlow', logo: 'https://placehold.co/120x60/f59e0b/ffffff?text=TechFlow' },
  { name: 'DataSync', logo: 'https://placehold.co/120x60/3b82f6/ffffff?text=DataSync' },
  { name: 'SparkAI', logo: 'https://placehold.co/120x60/ef4444/ffffff?text=SparkAI' },
  { name: 'Quantum', logo: 'https://placehold.co/120x60/10b981/ffffff?text=Quantum' },
];

export const TrustedCompanies: React.FC = () => {
  // Duplicate the companies array to create seamless loop
  const duplicatedCompanies = [...companies, ...companies];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-900/20 to-transparent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-theme-primary mb-4">
            Trusted by leading companies
          </h2>
          <p className="text-lg md:text-xl text-theme-secondary max-w-2xl mx-auto">
            Join thousands of businesses that rely on our platform
          </p>
        </div>

        {/* Infinite Scrolling Container */}
        <div className="relative overflow-hidden">
          {/* Gradient overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />

          {/* Scrolling wrapper with hover pause */}
          <div className="group relative">
            <motion.div
              className="flex gap-8 md:gap-12"
              animate={{
                x: [0, -50 + '%'], // Move exactly half the width (one full array)
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 30, // Adjust speed here (lower = faster)
                  ease: "linear",
                },
              }}
              style={{
                width: 'fit-content',
              }}
            >
              {duplicatedCompanies.map((company, index) => (
                <div
                  key={`${company.name}-${index}`}
                  className="flex-shrink-0 flex items-center justify-center px-3 py-2 md:px-4 md:py-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group-hover:[animation-play-state:paused] w-[100px] md:w-[160px]"
                >
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="w-full h-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Optional: Bottom text */}
        <p className="text-center text-theme-muted text-sm mt-8">
          And hundreds more companies worldwide
        </p>
      </div>
    </section>
  );
};
