import { useState } from 'react';
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
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { celebrateQuestComplete, celebrateLevelUp } from '@/lib/celebrate';
import { playTadaSound, playLevelUpSound } from '@/lib/sounds';
import { uploadQuestProof } from '@/lib/quest-proof';
import { QuestCard } from '@/components/quest-card';
import { QuestDetailSheet, type QuestLike } from '@/components/quest-detail-sheet';
import { Plus } from 'lucide-react';
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
      { id: 'all', label: 'ALL' }
    ] : [])
  ];

  if (!activePartyId) return null;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      {/* Sticky Header with Tabs */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 pt-4 pb-0">
        <h1 className="text-xl font-pixel text-primary mb-4">QUEST HUB</h1>
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
                          ? () => setSelectedQuest(q as QuestLike) // photo needed → open sheet
                          : () => handleComplete(q.id))
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
            : <EmptyState text="No open quests available." />
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
            isLeader={isLeader}
          />
        )}
      </div>

      {/* FAB for Leaders */}
      {isLeader && (
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
