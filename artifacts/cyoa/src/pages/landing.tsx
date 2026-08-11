import { Link } from 'wouter';
import { Sword } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[url('/boss-dust-bunny.png')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-background/90 z-0"></div>
      
      <div className="z-10 flex flex-col items-center w-full max-w-sm text-center">
        <div className="w-48 h-48 mb-6 rounded-2xl overflow-hidden bg-[#1a0a3a] flex items-center justify-center shadow-2xl border-4 border-primary/30 animate-bounce">
          <img src="/icon-512.png" alt="CYOA Crest" className="w-44 h-44 object-contain" />
        </div>
        
        <h1 className="text-3xl font-pixel text-primary mb-2 leading-tight">
          CHORES<br/>
          <span className="text-xl text-foreground">YOUR OWN</span><br/>
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
            Adult already have an account?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}