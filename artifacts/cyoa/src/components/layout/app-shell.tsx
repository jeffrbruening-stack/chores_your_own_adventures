import { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-background text-foreground flex flex-col relative overflow-x-hidden game-theme">
      {/* 
        We apply game-theme by default to the shell so it always feels like the SNES game.
        Light forms will override via local classes where needed.
      */}
      <main className="flex-1 w-full pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}