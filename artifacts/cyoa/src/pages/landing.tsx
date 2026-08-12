import { Link } from 'wouter';
import { Sword } from 'lucide-react';
import logoCrest from '../assets/logo-crest.png';

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[url('/boss-dust-bunny.png')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-background/90 z-0" />

      <div className="z-10 flex flex-col items-center w-full max-w-sm text-center">
        {/* Logo crest — includes wordmark; one-time entrance animation */}
        <div
          className="w-64 mb-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{ animation: 'cyoa-drop-in 0.6s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <img
            src={logoCrest}
            alt="Chores Your Own Adventure"
            className="w-full h-auto block"
            style={{ imageRendering: 'pixelated' }}
          />
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

        <h1 className="sr-only">Chores Your Own Adventure</h1>

        <p className="text-muted-foreground mt-2 mb-10 text-sm max-w-[280px]">
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
