import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetHomeData, getGetHomeDataQueryKey, useCompleteQuest, useGiveMeAQuest, getGiveMeAQuestQueryKey, useListMyParties, useGetMyCharacter, getListMyPartiesQueryKey, getGetMyCharacterQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { Progress } from '@/components/ui/progress';
import { QuestCard } from '@/components/quest-card';
import { Sword, Coins, Bell, ChevronDown, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { playSuccessSound, playLevelUpSound } from '@/lib/sounds';

export default function Home() {
  const { activePartyId, currentUser, setActivePartyId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: homeData, isLoading, refetch } = useGetHomeData({
    query: { enabled: !!activePartyId, queryKey: getGetHomeDataQueryKey() }
  });

  const { data: parties } = useListMyParties();
  const { data: character } = useGetMyCharacter();

  const completeQuestMutation = useCompleteQuest();
  
  // Custom fetch instead of hook for giveMeAQuest to avoid auto-firing on render
  // Actually orval gives us useGiveMeAQuest which is a query. It's better to use custom fetch or an enabled:false query.
  // Wait, giveMeAQuest is a GET endpoint. We should use it with enabled: false and refetch.
  const { refetch: giveMeQuest } = useGiveMeAQuest(
    { partyId: activePartyId! },
    { query: { enabled: false, gcTime: 0, queryKey: getGiveMeAQuestQueryKey({ partyId: activePartyId! }) } }
  );

  const handleGiveMeAQuest = async () => {
    try {
      const res = await giveMeQuest();
      if (res.data?.hasQuest) {
        toast({
          title: "New Quest Assigned!",
          description: res.data.quest?.plainTitle,
        });
        refetch();
        
        // Haptics & Sound
        if (currentUser?.hapticsEnabled && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        if (currentUser?.soundEnabled) {
          playSuccessSound();
        }
      } else {
        toast({
          title: "No quests available",
          description: "Take a break, hero! You've done everything.",
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleComplete = (questId: number) => {
    completeQuestMutation.mutate({ assignmentId: questId }, {
      onSuccess: (res) => {
        // Haptics & Sound
        if (currentUser?.hapticsEnabled && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }
        
        if (res.leveledUp) {
          if (currentUser?.soundEnabled) playLevelUpSound();
          toast({
            title: "LEVEL UP! 🎉",
            description: `You reached level ${res.newLevel}!`,
            className: "bg-yellow-500 text-black border-none font-bold",
          });
        } else {
          if (currentUser?.soundEnabled) playSuccessSound();
          toast({
            title: "Quest Completed!",
            description: `+${res.xpGained} XP, +${res.goldGained} Gold`,
            className: "bg-green-500 text-white border-none font-bold",
          });
        }
        refetch();
        queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  if (!activePartyId && parties && parties.length > 0) {
    setActivePartyId(parties[0].id);
    return null;
  }

  if (isLoading || !homeData) {
    return <div className="min-h-screen flex items-center justify-center font-pixel animate-pulse">LOADING...</div>;
  }

  const { user, myQuests, activeProject, activePartyGoal, xpForNextLevel, partyGoldReserve, needsAttention } = homeData;
  
  // Calculate XP progress
  // Wait, if currentLevel is 1 and lifetimeXp is 50, and next level is 100.
  // Actually the API doesn't give us currentLevel floor XP, so we'll approximate.
  // The levelCurve is roughly level^2 * 100 or something. 
  // Let's just show a simple bar based on xpForNextLevel (which is xp needed remaining).
  // Assuming 100xp per level for a visual.
  const xpNeeded = xpForNextLevel || 100;
  // This is a rough calc for the bar since we don't have the exact floor.
  const progressPercent = Math.max(5, 100 - Math.min(100, (xpForNextLevel / 100) * 100)); // Just a placeholder visual if we don't know the full curve.

  return (
    <div className="p-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-bold">CURRENT PARTY</span>
          <span className="font-pixel text-[10px] text-primary flex items-center gap-2">
            {homeData.activeParty.name} <ChevronDown className="w-3 h-3" />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-bold">PARTY GOLD</span>
            <span className="font-pixel text-[10px] text-yellow-400 flex items-center gap-1">
              {partyGoldReserve} <Coins className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Character Banner */}
      <div className="bg-card border-2 border-border p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
        {/* Simple pixel avatar placeholder based on color/species */}
        <div 
          className="w-20 h-20 shrink-0 bg-secondary rounded-lg pixel-border flex items-center justify-center text-4xl"
        >
          {character?.species === 'cat' ? '🐱' : character?.species === 'dog' ? '🐶' : '🧑'}
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold text-lg leading-none">{user.adventurerName || user.displayName}</h2>
              <span className="text-xs text-muted-foreground font-pixel block mt-1">LVL {user.currentLevel}</span>
            </div>
            <div className="bg-background px-2 py-1 rounded border flex items-center gap-1 text-xs font-bold text-yellow-500">
              {user.personalGold} <Coins className="w-3 h-3" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-pixel text-muted-foreground">
              <span>XP</span>
              <span>{xpForNextLevel} TO NEXT</span>
            </div>
            <Progress value={progressPercent} indicatorColor="bg-blue-500" />
          </div>
        </div>
      </div>

      {/* Big Action Button */}
      <button 
        onClick={handleGiveMeAQuest}
        className="w-full bg-primary text-primary-foreground font-pixel py-5 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
      >
        <Sparkles className="w-5 h-5" />
        GIVE ME A QUEST!
      </button>

      {/* Needs Attention (Leaders Only) */}
      {needsAttention && (needsAttention.pendingVerifications > 0 || needsAttention.proposedQuests > 0) && (
        <div className="bg-orange-500/10 border-2 border-orange-500/30 p-4 rounded-xl flex flex-col gap-3">
          <h3 className="font-pixel text-[10px] text-orange-500 flex items-center gap-2">
            <Bell className="w-4 h-4" /> NEEDS ATTENTION
          </h3>
          <div className="flex gap-2">
            {needsAttention.pendingVerifications > 0 && (
              <Link href="/quests?tab=pending" className="flex-1 bg-background border border-orange-500/50 p-2 rounded text-center">
                <div className="text-orange-500 font-pixel text-xl">{needsAttention.pendingVerifications}</div>
                <div className="text-[10px] font-bold text-muted-foreground">TO VERIFY</div>
              </Link>
            )}
            {needsAttention.proposedQuests > 0 && (
              <Link href="/quests?tab=proposed" className="flex-1 bg-background border border-orange-500/50 p-2 rounded text-center">
                <div className="text-orange-500 font-pixel text-xl">{needsAttention.proposedQuests}</div>
                <div className="text-[10px] font-bold text-muted-foreground">PROPOSED</div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Party Goal / Boss */}
      {activeProject && (
        <div className="bg-card border-2 border-red-900/50 p-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-pixel px-2 py-1 rounded-bl-lg">
            BOSS BATTLE
          </div>
          <h3 className="font-pixel text-[12px] text-red-500 mb-2">{activeProject.name}</h3>
          <Progress 
            value={(activeProject.completedTaskCount / activeProject.totalTaskCount) * 100} 
            indicatorColor="bg-red-500" 
            className="h-3"
          />
          <div className="text-right mt-1 text-[10px] text-muted-foreground font-bold">
            {activeProject.completedTaskCount} / {activeProject.totalTaskCount} ATTACKS
          </div>
        </div>
      )}

      {/* Your Quests */}
      <div className="flex flex-col gap-3">
        <h3 className="font-pixel text-xs text-muted-foreground flex items-center gap-2">
          <Sword className="w-4 h-4" /> YOUR ACTIVE QUESTS
        </h3>
        
        {myQuests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <p className="text-sm font-bold">No active quests.</p>
            <p className="text-xs mt-1">Tap the shiny button above to get one!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myQuests.map(quest => (
              <QuestCard 
                key={quest.id} 
                quest={quest} 
                onComplete={() => handleComplete(quest.id)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}