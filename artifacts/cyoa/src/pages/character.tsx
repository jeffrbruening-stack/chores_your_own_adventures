import { useAuth } from '@/contexts/auth-context';
import { useGetMyCharacter, useGetInventory } from '@workspace/api-client-react';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Trophy, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

export default function Character() {
  const { currentUser } = useAuth();
  const { data: character, isLoading: charLoading } = useGetMyCharacter();
  const { data: inventory, isLoading: invLoading } = useGetInventory();

  if (charLoading || !currentUser) {
    return <div className="min-h-screen flex items-center justify-center font-pixel animate-pulse">LOADING...</div>;
  }

  // Equipment slots to show
  const slots = [
    { id: 'head', label: 'HEAD' },
    { id: 'outfit', label: 'OUTFIT' },
    { id: 'main_hand', label: 'MAIN HAND' },
    { id: 'off_hand', label: 'OFF HAND' },
    { id: 'pet', label: 'PET' },
    { id: 'effect', label: 'EFFECT' },
  ];

  const equipped = inventory?.equipped || {};

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-sm border-b border-border px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-pixel text-primary">CHARACTER</h1>
        <Link href="/settings" className="text-muted-foreground p-2">
          <SettingsIcon className="w-5 h-5" />
        </Link>
      </div>

      <div className="p-4 flex flex-col gap-6">
        
        {/* Character Display Stage */}
        <div className="bg-card border-2 border-border rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden h-64 shadow-inner">
          {/* Background effect if equipped */}
          {equipped.background && (
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundColor: 'var(--primary)' }}></div>
          )}
          
          <div className="relative z-10 w-32 h-32 flex items-center justify-center">
            {/* The Avatar itself. Since we aren't generating dynamic images per user, we use a rich CSS representation or emoji. */}
            <div className="w-24 h-24 bg-primary/20 rounded-xl pixel-border flex items-center justify-center text-6xl shadow-xl">
              {character?.species === 'cat' ? '🐱' : character?.species === 'dog' ? '🐶' : '🧑'}
            </div>
            
            {/* Equipped Pet */}
            {equipped.pet && (
              <div className="absolute -bottom-2 -right-4 w-12 h-12 bg-secondary rounded-full pixel-border flex items-center justify-center text-2xl animate-bounce">
                {equipped.pet.emoji || '🐣'}
              </div>
            )}
          </div>
          
          <h2 className="mt-6 font-bold text-xl">{currentUser.adventurerName || currentUser.displayName}</h2>
          <div className="font-pixel text-xs text-primary mt-2 flex items-center gap-2">
            LVL {currentUser.currentLevel} <span className="text-muted-foreground">{character?.class}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border p-3 rounded-xl">
            <div className="text-[10px] font-bold text-muted-foreground mb-1">TOTAL XP</div>
            <div className="font-pixel text-sm text-blue-400">{currentUser.lifetimeXp}</div>
          </div>
          <div className="bg-card border border-border p-3 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-bold text-muted-foreground mb-1">LEGENDARY WINS</div>
            <div className="font-pixel text-sm text-yellow-500 flex items-center gap-2">
              {currentUser.legendaryCompletions || 0} <Trophy className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Equipment Grid */}
        <div>
          <h3 className="font-pixel text-xs text-muted-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> EQUIPMENT
          </h3>
          
          {invLoading ? (
            <div className="animate-pulse flex gap-2 h-20 bg-muted rounded-xl"></div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {slots.map(slot => {
                const item = (equipped as any)[slot.id];
                return (
                  <Link href={`/shop?category=${slot.id}`} key={slot.id}>
                    <div className={cn(
                      "aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                      item ? "border-primary bg-primary/5" : "border-dashed border-border bg-card/50"
                    )}>
                      {item ? (
                        <>
                          <div className="text-2xl">{item.emoji || '✨'}</div>
                          <div className="text-[8px] font-bold text-center px-1 leading-tight line-clamp-2">{item.name}</div>
                        </>
                      ) : (
                        <div className="text-[8px] font-bold text-muted-foreground text-center">{slot.label}</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}