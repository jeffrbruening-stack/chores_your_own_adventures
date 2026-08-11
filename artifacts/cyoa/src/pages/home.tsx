import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetHomeData, getGetHomeDataQueryKey,
  useCompleteQuest,
  useGiveMeAQuest, getGiveMeAQuestQueryKey,
  useListMyParties,
  useGetMyCharacter,
  useGetInventory,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { Progress } from '@/components/ui/progress';
import { QuestCard } from '@/components/quest-card';
import { PixelCharacter, type EquippedItems } from '@/components/pixel-character';
import { Sword, Coins, Bell, ChevronDown, Sparkles, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { playSuccessSound, playLevelUpSound } from '@/lib/sounds';
import { cn } from '@/lib/utils';

// Inline party-creation screen shown when user has no party
function SetupPartyScreen({ onPartyCreated }: { onPartyCreated: (id: number) => void }) {
  const [partyName, setPartyName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  const handleCreate = async () => {
    const name = partyName.trim();
    if (!name) { toast({ title: 'Enter a party name first', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('cyoa_token');
      const res = await fetch(`${BASE}/api/parties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const party = await res.json();
      queryClient.invalidateQueries();
      onPartyCreated(party.id);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="font-pixel text-primary text-base">FOUND YOUR PARTY</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Give your family a legendary name. Kids will join using the household code.
      </p>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="text"
          value={partyName}
          onChange={e => setPartyName(e.target.value)}
          placeholder="The Brave Household..."
          maxLength={40}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-center"
        />
        <button
          onClick={handleCreate}
          disabled={saving}
          className="bg-primary text-primary-foreground font-pixel py-4 rounded-xl text-xs pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 disabled:opacity-60"
        >
          {saving ? 'FOUNDING...' : '⚔️ FOUND THE PARTY'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">You can also join an existing party from the Party screen.</p>
    </div>
  );
}

// Minimal XP curve (mirrors backend)
const LEVEL_CURVE = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300, 4000, 4800, 5700, 6700];
function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVEL_CURVE[level - 1] ?? (level * 600);
}

export default function Home() {
  const { activePartyId, currentUser, setActivePartyId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: homeData, isLoading, refetch } = useGetHomeData({
    query: { enabled: !!activePartyId, queryKey: getGetHomeDataQueryKey() },
  });
  const { data: parties } = useListMyParties();
  const { data: character } = useGetMyCharacter();
  const { data: inventoryData } = useGetInventory();

  const completeQuestMutation = useCompleteQuest();
  const { refetch: giveMeQuest } = useGiveMeAQuest(
    { partyId: activePartyId! },
    { query: { enabled: false, gcTime: 0, queryKey: getGiveMeAQuestQueryKey({ partyId: activePartyId! }) } },
  );

  // Build equipped item map with names for PixelCharacter
  const equippedWithNames = useMemo((): EquippedItems => {
    if (!inventoryData) return {};
    const { items, equipped } = inventoryData as any;
    if (!equipped || !items) return {};
    const result: EquippedItems = {};
    for (const [slot, itemId] of Object.entries(equipped)) {
      const item = (items as any[]).find((i: any) => i.shopItemId === itemId);
      if (item) (result as any)[slot] = { name: item.name, emoji: item.emoji };
    }
    return result;
  }, [inventoryData]);

  // Auto-set party if none selected but user has parties
  if (!activePartyId && parties && parties.length > 0) {
    setActivePartyId(parties[0].id);
    return null;
  }

  // Show party setup before any loading guard — home query is disabled without a party
  if (!activePartyId) {
    return <SetupPartyScreen onPartyCreated={(id) => setActivePartyId(id)} />;
  }

  const handleGiveMeAQuest = async () => {
    try {
      const res = await giveMeQuest();
      if (res.data?.hasQuest) {
        toast({ title: 'Quest Assigned!', description: res.data.quest?.plainTitle });
        if (currentUser?.hapticsEnabled && 'vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        if (currentUser?.soundEnabled) playSuccessSound();
        refetch();
      } else {
        toast({ title: 'All clear!', description: 'No quests available right now. Take a break, hero!' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleComplete = (questId: number) => {
    completeQuestMutation.mutate({ assignmentId: questId }, {
      onSuccess: (res) => {
        if (currentUser?.hapticsEnabled && 'vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 200]);
        if (res.leveledUp) {
          if (currentUser?.soundEnabled) playLevelUpSound();
          toast({
            title: '⚡ LEVEL UP!',
            description: `You reached Level ${res.newLevel}!`,
            className: 'bg-yellow-500 text-black border-none font-bold',
          });
        } else {
          if (currentUser?.soundEnabled) playSuccessSound();
          toast({
            title: 'Quest Complete!',
            description: `+${res.xpGained} XP  +${res.goldGained} Gold`,
            className: 'bg-green-600 text-white border-none font-bold',
          });
        }
        refetch();
        queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      },
    });
  };

  if (isLoading || !homeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-primary animate-pulse">LOADING...</p>
      </div>
    );
  }

  if (!activePartyId) {
    return <SetupPartyScreen onPartyCreated={(id) => setActivePartyId(id)} />;
  }

  const { user, myQuests, activeGoal, xpForNextLevel, partyGoldReserve, activeParty, pendingVerificationsCount, proposedQuestsCount } = homeData as any;

  // XP progress bar
  const lvl = user.currentLevel;
  const baseXp = xpForLevel(lvl);
  const nextXp = xpForLevel(lvl + 1);
  const range = nextXp - baseXp || 100;
  const earned = user.lifetimeXp - baseXp;
  const xpPct = Math.min(100, Math.max(2, (earned / range) * 100));

  const isLeader = (homeData as any).myRole === 'leader' || (homeData as any).myRole === 'founder';

  return (
    <div className="flex flex-col gap-5 p-4 pb-24">
      {/* Party header */}
      <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
        <div>
          <div className="text-[10px] text-muted-foreground font-bold">CURRENT PARTY</div>
          <div className="font-pixel text-[11px] text-primary flex items-center gap-1 mt-0.5">
            {activeParty?.name ?? '—'} <ChevronDown className="w-3 h-3" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground font-bold">PARTY GOLD</div>
            <div className="font-pixel text-[11px] text-yellow-400 flex items-center gap-1 justify-end mt-0.5">
              {partyGoldReserve ?? 0} <Coins className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Character banner */}
      <div className="bg-card border-2 border-border rounded-2xl p-4 flex items-start gap-4 relative overflow-hidden">
        {/* Pixel character display */}
        <div className="shrink-0 flex items-center justify-center">
          <PixelCharacter
            appearance={{
              skinTone: character?.skinTone ?? undefined,
              hairStyle: character?.hairStyle ?? undefined,
              hairColor: character?.hairColor ?? undefined,
              eyeColor: character?.eyeColor ?? undefined,
              hasGlasses: character?.hasGlasses ?? false,
              facialHair: character?.facialHair ?? undefined,
              species: character?.species ?? undefined,
              gender: character?.gender ?? undefined,
              class: character?.class ?? undefined,
            }}
            equipped={equippedWithNames}
            size={100}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <h2 className="font-bold text-lg leading-tight truncate">
                {character?.adventurerName || user.displayName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-pixel text-[10px] text-primary">LVL {lvl}</span>
                {character?.class && (
                  <span className="text-[10px] text-muted-foreground capitalize">{character.class}</span>
                )}
              </div>
            </div>
            <div className="bg-background px-2 py-1 rounded-lg border border-yellow-500/40 flex items-center gap-1 text-xs font-bold text-yellow-400 shrink-0 ml-2">
              {user.personalGold} <Coins className="w-3 h-3" />
            </div>
          </div>

          {/* XP bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-pixel text-muted-foreground">
              <span>XP</span>
              <span>{xpForNextLevel ?? 0} TO NEXT</span>
            </div>
            <Progress value={xpPct} indicatorColor="bg-blue-500" className="h-2" />
          </div>
        </div>
      </div>

      {/* GIVE ME A QUEST */}
      <button
        onClick={handleGiveMeAQuest}
        className="w-full bg-primary text-primary-foreground font-pixel py-5 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(250,204,21,0.3)] text-sm"
      >
        <Sparkles className="w-5 h-5" />
        GIVE ME A QUEST!
      </button>

      {/* Leader attention banner */}
      {(pendingVerificationsCount > 0 || proposedQuestsCount > 0) && (
        <div className="bg-orange-500/10 border-2 border-orange-500/30 p-4 rounded-xl flex flex-col gap-3">
          <h3 className="font-pixel text-[10px] text-orange-400 flex items-center gap-2">
            <Bell className="w-4 h-4" /> NEEDS ATTENTION
          </h3>
          <div className="flex gap-2">
            {pendingVerificationsCount > 0 && (
              <Link href="/quests?tab=pending" className="flex-1">
                <div className="bg-background border border-orange-500/40 p-3 rounded-xl text-center">
                  <div className="text-orange-400 font-pixel text-xl">{pendingVerificationsCount}</div>
                  <div className="text-[9px] font-bold text-muted-foreground mt-0.5">TO VERIFY</div>
                </div>
              </Link>
            )}
            {proposedQuestsCount > 0 && (
              <Link href="/quests?tab=proposed" className="flex-1">
                <div className="bg-background border border-orange-500/40 p-3 rounded-xl text-center">
                  <div className="text-orange-400 font-pixel text-xl">{proposedQuestsCount}</div>
                  <div className="text-[9px] font-bold text-muted-foreground mt-0.5">PROPOSED</div>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Active party goal */}
      {activeGoal && (
        <div className="bg-card border-2 border-yellow-900/40 p-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-yellow-700/80 text-white text-[9px] font-pixel px-2 py-1 rounded-bl-lg">
            PARTY GOAL
          </div>
          <h3 className="font-pixel text-[11px] text-yellow-400 mb-2">{activeGoal.name}</h3>
          <Progress
            value={(activeGoal.currentGold / Math.max(1, activeGoal.targetGold)) * 100}
            indicatorColor="bg-yellow-500"
            className="h-2.5"
          />
          <div className="text-right mt-1 text-[9px] text-muted-foreground font-bold">
            {activeGoal.currentGold} / {activeGoal.targetGold} GOLD
          </div>
        </div>
      )}

      {/* Your quests */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-[10px] text-muted-foreground flex items-center gap-2">
            <Sword className="w-3 h-3" /> YOUR QUESTS
          </h3>
          {isLeader && (
            <Link href="/quest-create">
              <button className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                <Plus className="w-3 h-3" /> CREATE
              </button>
            </Link>
          )}
        </div>

        {!myQuests || myQuests.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center flex flex-col gap-2">
            <p className="font-pixel text-xs text-muted-foreground">YOUR QUEST LOG IS CLEAR</p>
            <p className="text-xs text-muted-foreground">No adventures await you right now.</p>
            <p className="text-xs text-muted-foreground">Tap the button above to get your next quest!</p>
            {isLeader && (
              <Link href="/quest-create">
                <button className="mt-2 text-xs font-bold text-primary hover:underline">
                  + Create a quest for your party
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myQuests.map((quest: any) => (
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
