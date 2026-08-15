import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListOpenQuests,
  useListMyQuestAssignments,
  useListPendingVerification,
  useListQuests,
  getListMyQuestAssignmentsQueryKey,
  getListOpenQuestsQueryKey,
  getListPendingVerificationQueryKey,
  getListQuestsQueryKey,
  getGetHomeDataQueryKey,
  useListProposedQuests,
  getListProposedQuestsQueryKey,
  useReviewQuestProposal,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { celebrateQuestComplete, celebrateLevelUp } from '@/lib/celebrate';
import { playTadaSound, playLevelUpSound } from '@/lib/sounds';
import { uploadQuestProof } from '@/lib/quest-proof';
import { QuestCard } from '@/components/quest-card';
import { QuestDetailSheet, type QuestLike } from '@/components/quest-detail-sheet';
import { Plus, X, Star, Coins } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

export default function Quests() {
  const { activePartyId, currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Parse tab from search params or default
  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get('tab') || 'mine';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Leaders are adults in this context — the party route provides the definitive role check
  const isLeader = currentUser?.userType === 'adult';

  const { data: myQuests, isLoading: loadingMine, refetch: refetchMine } = useListMyQuestAssignments(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId && activeTab === 'mine', queryKey: getListMyQuestAssignmentsQueryKey({ partyId: activePartyId! }) } }
  );

  const { data: openQuests, isLoading: loadingOpen } = useListOpenQuests(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId && activeTab === 'open', queryKey: getListOpenQuestsQueryKey({ partyId: activePartyId! }) } }
  );

  const { data: pendingQuests, isLoading: loadingPending, refetch: refetchPending } = useListPendingVerification(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId && activeTab === 'pending' && isLeader, queryKey: getListPendingVerificationQueryKey({ partyId: activePartyId! }) } }
  );

  const { data: allQuests, isLoading: loadingAll } = useListQuests(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId && activeTab === 'all' && isLeader, queryKey: getListQuestsQueryKey({ partyId: activePartyId! }) } }
  );

  const { data: proposedQuests, isLoading: loadingProposed, refetch: refetchProposed } = useListProposedQuests(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId && activeTab === 'proposed' && isLeader, queryKey: getListProposedQuestsQueryKey({ partyId: activePartyId! }) } }
  );
  const reviewProposalMutation = useReviewQuestProposal();

  // Bonus gold request state
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
  const [bonusSheetQuest, setBonusSheetQuest] = useState<{ id: number; title: string } | null>(null);
  const [bonusNote, setBonusNote] = useState('');
  const [bonusSubmitting, setBonusSubmitting] = useState(false);
  const [bonusRequests, setBonusRequests] = useState<any[]>([]);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusGoldAmounts, setBonusGoldAmounts] = useState<Record<number, number>>({});
  const [bonusDeclineReasons, setBonusDeclineReasons] = useState<Record<number, string>>({});
  const [bonusDeclining, setBonusDeclining] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (activeTab === 'bonus' && isLeader && activePartyId) {
      setBonusLoading(true);
      const token = localStorage.getItem('cyoa_token');
      fetch(`${BASE}/api/bonus-requests?partyId=${activePartyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => { setBonusRequests(Array.isArray(data) ? data : []); setBonusLoading(false); })
        .catch(() => setBonusLoading(false));
    }
  }, [activeTab, isLeader, activePartyId]);

  const handleSubmitBonusRequest = async () => {
    if (!bonusSheetQuest || !bonusNote.trim()) return;
    setBonusSubmitting(true);
    try {
      const token = localStorage.getItem('cyoa_token');
      const res = await fetch(`${BASE}/api/bonus-requests`, {
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

  const handleReviewBonus = async (requestId: number, approve: boolean) => {
    const gold = bonusGoldAmounts[requestId];
    const reason = bonusDeclineReasons[requestId]?.trim();
    if (approve && (!gold || gold < 1)) {
      toast({ title: 'Enter a gold amount first', variant: 'destructive' }); return;
    }
    if (!approve && !reason) {
      toast({ title: 'Add a reason so they know what to do next time', variant: 'destructive' }); return;
    }
    try {
      const token = localStorage.getItem('cyoa_token');
      const res = await fetch(`${BASE}/api/bonus-requests/${requestId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approved: approve, bonusGold: gold, declineReason: reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      toast(approve
        ? { title: `⭐ ${gold} bonus gold awarded!`, className: 'bg-yellow-500 text-black border-none font-bold' }
        : { title: 'Request passed on', description: reason });
      setBonusRequests(prev => prev.filter(r => r.id !== requestId));
      queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleReviewProposal = async (proposalId: number, approve: boolean) => {
    try {
      await reviewProposalMutation.mutateAsync({ questId: proposalId, data: { action: approve ? 'approve' : 'decline' } as any });
      toast({ title: approve ? 'Quest Approved!' : 'Suggestion Declined', description: approve ? "It's now on their quest list." : undefined });
      refetchProposed();
      queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListQuestsQueryKey({ partyId: activePartyId! }) });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const [selectedQuest, setSelectedQuest] = useState<QuestLike | null>(null);

  const handleComplete = async (assignmentId: number, photoFile?: File) => {
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      let photoPath: string | undefined;
      if (photoFile) {
        photoPath = await uploadQuestProof(assignmentId, photoFile);
      }
      const res = await fetch(`${BASE}/api/quests/assignments/${assignmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(photoPath ? { photoPath } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error ?? 'Failed');
      }
      const result = await res.json();
      if (result.status === 'submitted') {
        toast({
          title: '📨 Sent for Review!',
          description: 'A grown-up will check it — rewards come after approval.',
          className: 'bg-orange-500 text-white border-none font-bold',
        });
      } else {
        if (result.leveledUp) {
          celebrateLevelUp();
          if (currentUser?.soundEnabled) playLevelUpSound();
        } else {
          celebrateQuestComplete();
          if (currentUser?.soundEnabled) playTadaSound();
        }
        toast({
          title: result.leveledUp ? '⚡ LEVEL UP!' : '✅ Quest Complete!',
          description: result.leveledUp
            ? `You reached Level ${result.newLevel}!`
            : `+${result.xpGained ?? result.xpAwarded} XP  +${result.goldGained ?? result.goldAwarded} Gold`,
          className: result.leveledUp ? 'bg-yellow-500 text-black border-none font-bold' : 'bg-green-600 text-white border-none font-bold',
        });
      }
      // Refresh all relevant caches
      queryClient.invalidateQueries({ queryKey: getListMyQuestAssignmentsQueryKey({ partyId: activePartyId! }) });
      queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
      refetchMine();
      setSelectedQuest(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleVerify = async (assignmentId: number, approved: boolean = true) => {
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/quests/assignments/${assignmentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed');
      toast(approved
        ? { title: '✅ Quest Verified!', description: 'Rewards have been awarded.', className: 'bg-green-600 text-white border-none font-bold' }
        : { title: '↩️ Sent Back', description: 'The quest is active again for another try.', className: 'bg-orange-500 text-white border-none font-bold' });
      queryClient.invalidateQueries({ queryKey: getListPendingVerificationQueryKey({ partyId: activePartyId! }) });
      queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
      refetchPending();
      setSelectedQuest(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const tabs = [
    { id: 'mine', label: 'MY QUESTS' },
    { id: 'open', label: 'OPEN' },
    ...(isLeader ? [
      { id: 'pending', label: 'VERIFY' },
      { id: 'bonus', label: 'BONUS ⭐' },
      { id: 'proposed', label: 'SUGGESTED' },
      { id: 'all', label: 'ALL' }
    ] : [])
  ];

  if (!activePartyId) return null;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      {/* Sticky Header with Tabs */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-pixel text-primary">QUEST HUB</h1>
          {isLeader && (
            <Link href="/quest-create">
              <button className="flex items-center gap-1.5 bg-primary text-primary-foreground font-pixel text-[10px] px-3 py-2 rounded-lg active:scale-95 transition-transform" data-testid="button-create-quest-header">
                <Plus className="w-3.5 h-3.5" /> CREATE QUEST
              </button>
            </Link>
          )}
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-xs font-pixel whitespace-nowrap transition-colors border-b-2",
                activeTab === tab.id
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {activeTab === 'mine' && (
          loadingMine ? <LoadingState /> :
          myQuests?.length
            ? myQuests.map(q => (
                <QuestCard
                  key={q.id}
                  quest={q as QuestLike}
                  onComplete={
                    q.status === 'active'
                      ? ((q as any).requiresVerification && (q as any).verificationType === 'photo'
                          ? () => setSelectedQuest(q as QuestLike)
                          : () => handleComplete(q.id))
                      : undefined
                  }
                  onBonusRequest={
                    !isLeader && (q.status === 'active' || q.status === 'completed')
                      ? () => { setBonusSheetQuest({ id: q.id, title: (q as any).plainTitle ?? (q as any).adventureTitle ?? 'Quest' }); setBonusNote(''); }
                      : undefined
                  }
                  onClick={() => setSelectedQuest(q as QuestLike)}
                />
              ))
            : <EmptyState text="You have no active quests." />
        )}

        {activeTab === 'open' && (
          loadingOpen ? <LoadingState /> :
          openQuests?.length
            ? openQuests.map(q => <QuestCard key={q.id} quest={q as QuestLike} onClick={() => setSelectedQuest(q as QuestLike)} />)
            : <EmptyState text="No open quests to claim. Open quests are 'anyone can grab it' chores — pick OPEN QUEST when creating one." />
        )}

        {activeTab === 'pending' && isLeader && (
          loadingPending ? <LoadingState /> :
          pendingQuests?.length
            ? pendingQuests.map(q => (
                <QuestCard
                  key={q.id}
                  quest={q as QuestLike}
                  isLeader
                  onVerify={() => handleVerify(q.id)}
                  onClick={() => setSelectedQuest(q as QuestLike)}
                />
              ))
            : <EmptyState text="Nothing pending verification." />
        )}

        {activeTab === 'bonus' && isLeader && (
          bonusLoading ? <LoadingState /> :
          bonusRequests.length === 0
            ? <EmptyState text="No bonus gold requests right now." />
            : bonusRequests.map((r: any) => (
                <div key={r.id} className="bg-card border-2 border-yellow-500/40 rounded-xl p-4 flex flex-col gap-3" data-testid={`bonus-request-${r.id}`}>
                  {/* Header */}
                  <div>
                    <p className="text-xs font-bold text-yellow-400 font-pixel">⭐ EXTRA EFFORT</p>
                    <p className="font-bold text-sm mt-1">{r.userName ?? 'Adventurer'}</p>
                    {r.questTitle && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        on: {r.questTitle}
                        {r.questGoldReward != null && (
                          <span className="ml-1 flex items-center gap-0.5 text-yellow-500 font-bold">
                            (standard reward: <Coins className="w-3 h-3" />{r.questGoldReward})
                          </span>
                        )}
                      </p>
                    )}
                    {r.note && <p className="text-sm mt-2 italic text-foreground">"{r.note}"</p>}
                  </div>

                  {/* Award row */}
                  {!bonusDeclining[r.id] && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-background border border-yellow-500/40 rounded-lg px-2 py-1.5 flex-1">
                        <Coins className="w-3 h-3 text-yellow-400 shrink-0" />
                        <input
                          type="number"
                          min={1}
                          max={999}
                          placeholder="Bonus gold"
                          value={bonusGoldAmounts[r.id] ?? ''}
                          onChange={e => setBonusGoldAmounts(prev => ({ ...prev, [r.id]: parseInt(e.target.value) || 0 }))}
                          className="bg-transparent text-sm font-bold text-yellow-400 w-full outline-none"
                          data-testid={`input-bonus-gold-${r.id}`}
                        />
                      </div>
                      <button
                        onClick={() => handleReviewBonus(r.id, true)}
                        className="px-3 py-2 bg-yellow-500 text-black font-pixel text-xs rounded-lg active:scale-95 transition-transform shrink-0"
                        data-testid={`button-award-bonus-${r.id}`}
                      >
                        AWARD
                      </button>
                      <button
                        onClick={() => setBonusDeclining(prev => ({ ...prev, [r.id]: true }))}
                        className="px-3 py-2 bg-muted text-muted-foreground font-pixel text-xs rounded-lg active:scale-95 transition-transform shrink-0"
                        data-testid={`button-decline-bonus-${r.id}`}
                      >
                        PASS
                      </button>
                    </div>
                  )}

                  {/* Decline reason */}
                  {bonusDeclining[r.id] && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-pixel text-muted-foreground">WHY NOT THIS TIME? (they'll see this)</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Great effort! But the baseline is already 30 min — try 45 next time."
                        value={bonusDeclineReasons[r.id] ?? ''}
                        onChange={e => setBonusDeclineReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none"
                        data-testid={`input-decline-reason-${r.id}`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewBonus(r.id, false)}
                          className="flex-1 py-2 bg-muted text-muted-foreground font-pixel text-xs rounded-lg active:scale-95 transition-transform"
                          data-testid={`button-confirm-decline-${r.id}`}
                        >
                          SEND & PASS
                        </button>
                        <button
                          onClick={() => setBonusDeclining(prev => ({ ...prev, [r.id]: false }))}
                          className="px-3 py-2 border border-border text-muted-foreground font-pixel text-xs rounded-lg active:scale-95 transition-transform"
                        >
                          BACK
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
        )}

        {activeTab === 'proposed' && isLeader && (
          loadingProposed ? <LoadingState /> :
          proposedQuests?.length
            ? proposedQuests.map((p: any) => (
                <div key={p.id} className="border-2 border-orange-400/50 bg-card rounded-xl p-4" data-testid={`card-proposal-${p.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-pixel text-sm text-foreground">{p.adventureTitle || p.plainTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">{p.plainTitle}</p>
                      {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                      <p className="text-xs text-orange-400 mt-2 font-bold">
                        Suggested by {p.proposedByName ?? 'an adventurer'} • {String(p.difficulty).toUpperCase()} • {p.xpReward} XP / {p.goldReward} gold
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleReviewProposal(p.id, true)}
                      disabled={reviewProposalMutation.isPending}
                      className="flex-1 py-2 bg-primary text-primary-foreground font-pixel text-xs rounded-lg active:scale-95 transition-transform"
                      data-testid={`button-approve-proposal-${p.id}`}
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => handleReviewProposal(p.id, false)}
                      disabled={reviewProposalMutation.isPending}
                      className="flex-1 py-2 bg-muted text-muted-foreground font-pixel text-xs rounded-lg active:scale-95 transition-transform"
                      data-testid={`button-decline-proposal-${p.id}`}
                    >
                      DECLINE
                    </button>
                  </div>
                </div>
              ))
            : <EmptyState text="No quest suggestions waiting for review." />
        )}

        {activeTab === 'all' && isLeader && (
          loadingAll ? <LoadingState /> :
          allQuests?.length
            ? allQuests.map(q => <QuestCard key={q.id} quest={q as QuestLike} isLeader onClick={() => setSelectedQuest(q as QuestLike)} />)
            : <EmptyState text="No quests yet. Create one!" />
        )}

        {selectedQuest && (
          <QuestDetailSheet
            quest={selectedQuest}
            onClose={() => setSelectedQuest(null)}
            onComplete={
              selectedQuest.status === 'active'
                ? (photoFile?: File) => handleComplete(selectedQuest.id, photoFile)
                : undefined
            }
            onVerify={
              isLeader && (selectedQuest.status === 'submitted' || selectedQuest.status === 'pending_verification')
                ? (approved: boolean) => handleVerify(selectedQuest.id, approved)
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
      </div>

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
              data-testid="input-bonus-note"
            />
            <button
              onClick={handleSubmitBonusRequest}
              disabled={!bonusNote.trim() || bonusSubmitting}
              className="w-full bg-yellow-500 text-black font-pixel py-4 rounded-xl text-xs pixel-corners border-b-4 border-r-4 border-yellow-700 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
              data-testid="button-submit-bonus-request"
            >
              {bonusSubmitting ? 'SENDING...' : '⭐ REQUEST BONUS GOLD'}
            </button>
          </div>
        </div>
      )}

      {/* FAB — kids' creations become suggestions a grown-up approves */}
      {(
        <Link
          href="/quest-create"
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-30"
        >
          <Plus className="w-8 h-8" />
        </Link>
      )}
    </div>
  );
}

function LoadingState() {
  return <div className="text-center py-8 font-pixel animate-pulse text-muted-foreground">LOADING...</div>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
      <p className="text-sm font-bold">{text}</p>
    </div>
  );
}
