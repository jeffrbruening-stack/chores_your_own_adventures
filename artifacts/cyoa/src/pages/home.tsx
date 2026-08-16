import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetHomeData, getGetHomeDataQueryKey,
  useListMyParties,
  useGetMyCharacter,
  useGetInventory,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { Progress } from '@/components/ui/progress';
import { QuestCard } from '@/components/quest-card';
import { PartyGoalCard } from '@/components/party-goal-card';
import { QuestDetailSheet, type QuestLike } from '@/components/quest-detail-sheet';
import { Sword, Coins, Bell, ChevronDown, ChevronRight, Plus, Settings as SettingsIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { playSuccessSound, playLevelUpSound, playTadaSound } from '@/lib/sounds';
import { celebrateQuestComplete, celebrateLevelUp } from '@/lib/celebrate';
import { uploadQuestProof, completeQuestAssignment } from '@/lib/quest-proof';
import { cn } from '@/lib/utils';

// Pixel-art broom SVG — used for the "Give Me a Quest!" action
import { type EquippedItems } from '@/components/pixel-character';
import { CharacterSprite } from '@/components/character-sprite';
import type { EquippedSpriteKeys } from '@/components/sprite-doll';

/** Slots SpriteDoll actually knows how to draw an override for (see sprite-doll.tsx EquippedSpriteKeys). */
const SPRITE_SLOTS = new Set(['head', 'outfit', 'legs', 'main_hand', 'back']);

function BroomIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ imageRendering: 'pixelated' }}>
      {/* Wooden handle — diagonal from top-right to lower-left */}
      <rect x="14" y="1" width="2" height="2" fill="#A0522D"/>
      <rect x="12" y="3" width="2" height="2" fill="#A0522D"/>
      <rect x="10" y="5" width="2" height="2" fill="#9B4D1E"/>
      <rect x="8"  y="7" width="2" height="2" fill="#9B4D1E"/>
      <rect x="6"  y="9" width="2" height="2" fill="#8B4513"/>
      {/* Binding band */}
      <rect x="1"  y="10" width="8" height="2" fill="#5C2E0A"/>
      {/* Bristles — fanned straw strips */}
      <rect x="0"  y="12" width="2" height="4" fill="#D4A017"/>
      <rect x="2"  y="12" width="2" height="6" fill="#D4A017"/>
      <rect x="4"  y="12" width="2" height="5" fill="#D4A017"/>
      <rect x="6"  y="12" width="2" height="6" fill="#D4A017"/>
      <rect x="8"  y="12" width="2" height="4" fill="#D4A017"/>
      {/* Sparkle 1 — gold cross near handle top */}
      <rect x="16" y="3" width="1" height="3" fill="#FFD700"/>
      <rect x="15" y="4" width="3" height="1" fill="#FFD700"/>
      {/* Sparkle 2 — purple cross near handle/bristle join */}
      <rect x="13" y="7" width="1" height="3" fill="#C084FC"/>
      <rect x="12" y="8" width="3" height="1" fill="#C084FC"/>
    </svg>
  );
}

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
  const [selectedQuest, setSelectedQuest] = useState<QuestLike | null>(null);
  const [bonusSheetQuest, setBonusSheetQuest] = useState<{ id: number; title: string } | null>(null);
  const [bonusNote, setBonusNote] = useState('');
  const [bonusSubmitting, setBonusSubmitting] = useState(false);
  const [declinedRequests, setDeclinedRequests] = useState<any[]>([]);
  const [dismissedDeclines, setDismissedDeclines] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cyoa_dismissed_declines') ?? '[]')); }
    catch { return new Set(); }
  });
  const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');

  const isLeaderCheck = currentUser?.userType === 'adult';

  useEffect(() => {
    if (isLeaderCheck) return; // only for kids
    const token = localStorage.getItem('cyoa_token');
    fetch(`${BASE_URL}/api/bonus-requests/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDeclinedRequests(data); })
      .catch(() => {});
  }, [isLeaderCheck, BASE_URL]);

  const handleSubmitBonusRequest = async () => {
    if (!bonusSheetQuest || !bonusNote.trim()) return;
    setBonusSubmitting(true);
    try {
      const token = localStorage.getItem('cyoa_token');
      const res = await fetch(`${BASE_URL}/api/bonus-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ partyId: activePartyId, assignmentId: bonusSheetQuest.id, note: bonusNote }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      toast({ title: '⭐ Sent!', description: 'Your extra effort is waiting for a grown-up to review.' });
      setBonusSheetQuest(null);
      setBonusNote('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBonusSubmitting(false);
    }
  };

  const { data: homeData, isLoading, refetch } = useGetHomeData({
    query: { enabled: !!activePartyId, queryKey: getGetHomeDataQueryKey() },
  });
  const { data: parties } = useListMyParties();
  const { data: character } = useGetMyCharacter();
  const { data: inventoryData } = useGetInventory();


  // Build equipped item map with names for PixelCharacter, plus the
  // sprite-key subset SpriteDoll needs to actually draw purchased gear.
  const { equippedWithNames, equippedSpriteKeys } = useMemo((): { equippedWithNames: EquippedItems; equippedSpriteKeys: EquippedSpriteKeys } => {
    if (!inventoryData) return { equippedWithNames: {}, equippedSpriteKeys: {} };
    const { items, equipped } = inventoryData as any;
    if (!equipped || !items) return { equippedWithNames: {}, equippedSpriteKeys: {} };
    const equippedWithNames: EquippedItems = {};
    const equippedSpriteKeys: EquippedSpriteKeys = {};
    for (const [slot, itemId] of Object.entries(equipped)) {
      const item = (items as any[]).find((i: any) => i.shopItemId === itemId);
      if (item) {
        (equippedWithNames as any)[slot] = { name: item.name, emoji: item.emoji };
        if (item.spriteKey && SPRITE_SLOTS.has(slot)) (equippedSpriteKeys as any)[slot] = item.spriteKey;
      }
    }
    return { equippedWithNames, equippedSpriteKeys };
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
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/home/give-me-a-quest?partyId=${activePartyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.hasQuest && data.quest) {
        if (currentUser?.hapticsEnabled && 'vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        if (currentUser?.soundEnabled) playSuccessSound();
        if (data.newlyAssigned) {
          // New open quest was assigned — refresh home data
          refetch();
          queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
          toast({ title: '⚔️ Quest Assigned!', description: data.quest.plainTitle });
        }
        // Always open the quest detail sheet for the surfaced quest
        setSelectedQuest(data.quest as QuestLike);
      } else {
        toast({ title: '🛌 All clear!', description: data.message ?? 'No quests available right now. Take a break, hero!' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleComplete = async (questId: number, photoFile?: File) => {
    let photoPath: string | undefined;
    if (photoFile) {
      try {
        photoPath = await uploadQuestProof(questId, photoFile);
      } catch (e: any) {
        toast({ title: 'Photo upload failed', description: e.message, variant: 'destructive' });
        return;
      }
    }
    try {
      const res = await completeQuestAssignment(questId, photoPath);
      if (currentUser?.hapticsEnabled && 'vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 200]);
      if (res.status === 'submitted') {
        toast({
          title: '📨 Sent for Review!',
          description: 'A grown-up will check it — rewards come after approval.',
          className: 'bg-orange-500 text-white border-none font-bold',
        });
      } else if (res.leveledUp) {
        celebrateLevelUp();
        if (currentUser?.soundEnabled) playLevelUpSound();
        toast({
          title: '⚡ LEVEL UP!',
          description: `You reached Level ${res.newLevel}!`,
          className: 'bg-yellow-500 text-black border-none font-bold',
        });
      } else {
        celebrateQuestComplete();
        if (currentUser?.soundEnabled) playTadaSound();
        toast({
          title: 'Quest Complete!',
          description: `+${res.xpGained} XP  +${res.goldGained} Gold`,
          className: 'bg-green-600 text-white border-none font-bold',
        });
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
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

  const { user, myQuests, activeGoal, xpForNextLevel, partyGoldReserve, activeParty, pendingVerificationsCount, proposedQuestsCount, bonusRequestsCount } = homeData as any;

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
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground font-bold">PARTY GOLD</div>
            <div className="font-pixel text-[11px] text-yellow-400 flex items-center gap-1 justify-end mt-0.5">
              {partyGoldReserve ?? 0} <Coins className="w-3 h-3" />
            </div>
          </div>
          <Link
            href="/settings"
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Settings & exit"
            data-testid="link-settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Character banner */}
      <div className="bg-card border-2 border-border rounded-2xl p-4 flex items-start gap-4 relative overflow-hidden">
        {/* Pixel character display */}
        <div className="shrink-0 flex items-center justify-center">
          <CharacterSprite character={character as any} equippedSpriteKeys={equippedSpriteKeys} size={140} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <Link href="/character" className="min-w-0 group" data-testid="link-character-details">
              <h2 className="font-bold text-lg leading-tight truncate group-active:text-primary transition-colors">
                {character?.adventurerName || user.displayName}
                <ChevronRight className="w-4 h-4 inline-block ml-1 text-muted-foreground align-middle" />
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-pixel text-[10px] text-primary">LVL {lvl}</span>
                {character?.class && (
                  <span className="text-[10px] text-muted-foreground capitalize">{character.class}</span>
                )}
              </div>
            </Link>
            <div className="bg-background px-2 py-1 rounded-lg border border-yellow-500/40 shrink-0 ml-2 text-center" data-testid="badge-my-gold">
              <div className="text-[8px] font-pixel text-muted-foreground">MY GOLD</div>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-yellow-400">
                {user.personalGold} <Coins className="w-3 h-3" />
              </div>
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
        <BroomIcon className="w-5 h-5" />
        GIVE ME A QUEST!
      </button>

      {/* Leader attention banner */}
      {(pendingVerificationsCount > 0 || proposedQuestsCount > 0 || bonusRequestsCount > 0) && (
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
            {bonusRequestsCount > 0 && (
              <Link href="/quests?tab=bonus" className="flex-1">
                <div className="bg-background border border-orange-500/40 p-3 rounded-xl text-center">
                  <div className="text-yellow-400 font-pixel text-xl">{bonusRequestsCount}</div>
                  <div className="text-[9px] font-bold text-muted-foreground mt-0.5">BONUS ⭐</div>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Kid: bonus request outcome messages (approved or declined) */}
      {!isLeader && declinedRequests.filter(r => !dismissedDeclines.has(r.id)).map(r => (
        <div
          key={r.id}
          className={cn(
            "border-2 rounded-xl p-4 flex flex-col gap-2",
            r.status === 'approved' ? "bg-yellow-500/10 border-yellow-500/40" : "bg-card border-muted"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-xs font-pixel", r.status === 'approved' ? "text-yellow-400" : "text-muted-foreground")}>
              {r.status === 'approved' ? '⭐ BONUS GOLD AWARDED!' : 'ABOUT YOUR EXTRA EFFORT REQUEST'}
            </p>
            <button
              onClick={() => setDismissedDeclines(prev => {
                const next = new Set([...prev, r.id]);
                localStorage.setItem('cyoa_dismissed_declines', JSON.stringify([...next]));
                return next;
              })}
              className="text-muted-foreground shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {r.questTitle && <p className="text-xs text-muted-foreground">"{r.questTitle}"</p>}
          {r.status === 'approved' ? (
            <p className="text-sm font-bold">
              A grown-up sent you <span className="text-yellow-400">+{r.bonusGold} bonus gold</span> for going above and beyond! 🎉
            </p>
          ) : (
            <>
              <p className="text-sm font-bold">A grown-up passed on this one:</p>
              <p className="text-sm italic text-foreground bg-muted/40 rounded-lg px-3 py-2">"{r.declineReason}"</p>
            </>
          )}
        </div>
      ))}

      {/* Active party goal */}
      {activeGoal && (
        <PartyGoalCard goal={activeGoal} isLeader={isLeader} partyId={activePartyId!} compact />
      )}

      {/* Quest detail sheet */}
      {selectedQuest && (
        <QuestDetailSheet
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          onComplete={
            selectedQuest.status === 'active'
              ? (photoFile?: File) => { handleComplete(selectedQuest.id, photoFile); setSelectedQuest(null); }
              : undefined
          }
          onBonusRequest={
            !isLeader && (selectedQuest.status === 'active' || selectedQuest.status === 'completed')
              ? () => { setSelectedQuest(null); setBonusSheetQuest({ id: selectedQuest.id, title: selectedQuest.plainTitle }); setBonusNote(''); }
              : undefined
          }
          isLeader={isLeader}
        />
      )}

      {/* Bonus gold request sheet */}
      {bonusSheetQuest && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" onClick={() => setBonusSheetQuest(null)}>
          <div className="w-full max-w-md bg-card border-2 border-yellow-500/40 rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-pixel text-sm text-yellow-400">⭐ I DID EXTRA!</h2>
              <button onClick={() => setBonusSheetQuest(null)} className="text-muted-foreground p-1"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Tell a grown-up what extra effort you put in — they can send you bonus gold!</p>
            <label className="text-[10px] font-pixel text-muted-foreground">WHAT DID YOU DO EXTRA?</label>
            <textarea
              value={bonusNote}
              onChange={e => setBonusNote(e.target.value)}
              placeholder="I practiced my bass for 30 minutes instead of 10!"
              rows={3}
              className="w-full mt-1 mb-4 bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none"
            />
            <button
              onClick={handleSubmitBonusRequest}
              disabled={!bonusNote.trim() || bonusSubmitting}
              className="w-full bg-yellow-500 text-black font-pixel py-4 rounded-xl text-xs pixel-corners border-b-4 border-r-4 border-yellow-700 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
            >
              {bonusSubmitting ? 'SENDING...' : '⭐ REQUEST BONUS GOLD'}
            </button>
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
                quest={quest as QuestLike}
                onComplete={
                  quest.requiresVerification && quest.verificationType === 'photo'
                    ? () => setSelectedQuest(quest as QuestLike)
                    : () => handleComplete(quest.id)
                }
                onBonusRequest={
                  !isLeader && (quest.status === 'active' || quest.status === 'completed')
                    ? () => { setBonusSheetQuest({ id: quest.id, title: quest.plainTitle ?? quest.adventureTitle ?? 'Quest' }); setBonusNote(''); }
                    : undefined
                }
                onClick={() => setSelectedQuest(quest as QuestLike)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
