import React from 'react';

interface Company {
  name: string;
  logo: string;
}

const companies: Company[] = [
  { name: 'Spotify', logo: 'https://cdn.simpleicons.org/spotify/1DB954' },
  { name: 'GitHub', logo: 'https://cdn.simpleicons.org/github/ffffff' },
  { name: 'Shopify', logo: 'https://cdn.simpleicons.org/shopify/7AB55C' },
  { name: 'Stripe', logo: 'https://cdn.simpleicons.org/stripe/635BFF' },
  { name: 'Notion', logo: 'https://cdn.simpleicons.org/notion/ffffff' },
  { name: 'Figma', logo: 'https://cdn.simpleicons.org/figma' },
  { name: 'Discord', logo: 'https://cdn.simpleicons.org/discord/5865F2' },
  { name: 'Vercel', logo: 'https://cdn.simpleicons.org/vercel/ffffff' },
];

const LogoItem: React.FC<{ company: Company }> = ({ company }) => (
  <div className="flex-shrink-0 flex items-center justify-center w-32 md:w-40 h-16 md:h-20">
    <img
      src={company.logo}
      alt={company.name}
      className="h-8 md:h-10 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
    />
  </div>
);

export const TrustedCompanies: React.FC = () => {
  // Calculate total width for animation (8 logos × width per logo)
  const logoWidth = 160; // md:w-40 = 10rem = 160px
  const totalWidth = companies.length * logoWidth;

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

          {/* Scrolling track - 3 sets for seamless looping */}
          <div
            className="flex logo-scroll"
            style={{
              '--scroll-width': `${totalWidth}px`
            } as React.CSSProperties}
          >
            {/* Three sets of logos to ensure seamless coverage */}
            {[0, 1, 2].map((setIndex) =>
              companies.map((company, index) => (
                <LogoItem key={`${setIndex}-${index}`} company={company} />
              ))
            )}
          </div>
        </div>

        {/* Optional: Bottom text */}
        <p className="text-center text-theme-muted text-sm mt-8">
          And hundreds more companies worldwide
        </p>
      </div>

      {/* CSS for infinite scroll animation */}
      <style>{`
        @keyframes scrollLogos {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(var(--scroll-width) * -1));
          }
        }

        .logo-scroll {
          animation: scrollLogos 20s linear infinite;
        }

        .logo-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};