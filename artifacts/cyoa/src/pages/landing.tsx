import { Link } from 'wouter';
import { Sword } from 'lucide-react';

/** Pixel-art crossed sword + broom logo — no coat of arms */
function CyoaLogo({ size = 192 }: { size?: number }) {
  const P = 4; // each "pixel" = 4 SVG units on a 64×64 canvas
  // Sword  /  : bottom-left (4,52) to top-right (52,4), step +4x / -4y
  // Broom  \  : top-left (4,4) to bottom-right (52,52), step +4x / +4y
  // They cross at step=6 → (28,28)
  const swordSteps = Array.from({ length: 13 }, (_, i) => ({ x: 4 + i * P, y: 52 - i * P, i }));
  const broomSteps = Array.from({ length: 13 }, (_, i) => ({ x: 4 + i * P, y: 4 + i * P, i }));

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="Chores Your Own Adventure Logo"
    >
      {/* Background */}
      <rect width="64" height="64" rx="10" fill="#1a0a3a" />

      {/* BROOM \ : handle steps 0-5, bristle fan steps 7-12 */}
      {broomSteps.slice(0, 6).map(({ x, y, i }) => (
        <rect key={`bh${i}`} x={x} y={y} width={P} height={P} fill="#7B3F00" />
      ))}
      {/* Bristle fan (steps 7-12) — fan out from ~step 7 */}
      {broomSteps.slice(7).map(({ x, y, i }) => (
        <rect key={`bb${i}`} x={x} y={y} width={P} height={P} fill="#D4A847" />
      ))}
      {/* Extra bristle rows for fan effect */}
      <rect x={36} y={36} width={P} height={P} fill="#C89830" />
      <rect x={40} y={36} width={P} height={P} fill="#D4A847" />
      <rect x={44} y={36} width={P} height={P} fill="#C89830" />
      <rect x={36} y={44} width={P} height={P} fill="#C89830" />
      <rect x={40} y={44} width={P} height={P} fill="#D4A847" />
      <rect x={44} y={44} width={P} height={P} fill="#C89830" />

      {/* SWORD / : handle steps 0-1, crossguard at y=28, blade steps 3-12 */}
      {/* Pommel (gold) at very bottom-left */}
      <rect x={2} y={54} width={P + 2} height={P + 2} fill="#D4A847" />
      {/* Handle (dark brown) steps 0-1 */}
      {swordSteps.slice(0, 2).map(({ x, y, i }) => (
        <rect key={`sh${i}`} x={x} y={y} width={P} height={P} fill="#5A2C0A" />
      ))}
      {/* Crossguard (gold) — horizontal at y=28, spanning crossing point */}
      <rect x={16} y={28} width={P * 8} height={P} fill="#D4A847" />
      {/* Blade (silver) steps 3-12 */}
      {swordSteps.slice(3).map(({ x, y, i }) => (
        <rect key={`sb${i}`} x={x} y={y} width={P} height={P} fill="#C0D0E0" />
      ))}
      {/* Blade tip (brighter) */}
      <rect x={52} y={4} width={P} height={P} fill="#E8F4FF" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[url('/boss-dust-bunny.png')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-background/90 z-0" />

      <div className="z-10 flex flex-col items-center w-full max-w-sm text-center">
        {/* Logo — one-time entrance animation, no continuous bounce */}
        <div
          className="w-48 h-48 mb-6 rounded-2xl overflow-hidden bg-[#1a0a3a] flex items-center justify-center shadow-2xl border-4 border-primary/30"
          style={{ animation: 'cyoa-drop-in 0.6s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <CyoaLogo size={176} />
        </div>

        <style>{`
          @keyframes cyoa-drop-in {
            from { opacity: 0; transform: translateY(-24px) scale(0.92); }
            to   { opacity: 1; transform: translateY(0)    scale(1);    }
          }
          @media (prefers-reduced-motion: reduce) {
            .cyoa-logo-wrap { animation: none !important; }
          }
        `}</style>

        <h1 className="text-3xl font-pixel text-primary mb-2 leading-tight">
          CHORES<br />
          <span className="text-xl text-foreground">YOUR OWN</span><br />
          ADVENTURE
        </h1>

        <p className="text-muted-foreground mt-4 mb-12 text-sm max-w-[280px]">
          Turn your family chores into a fantasy RPG. Level up, earn gold, and defeat monsters together.
        </p>

        <div className="w-full flex flex-col gap-4">
          <Link href="/register" className="w-full">
            <button className="w-full bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all flex items-center justify-center gap-3 text-sm">
              <Sword className="w-5 h-5" />
              CREATE A PARTY
            </button>
          </Link>

          <Link href="/kid-login" className="w-full">
            <button className="w-full bg-secondary text-secondary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all text-sm">
              JOIN A PARTY (KIDS)
            </button>
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
