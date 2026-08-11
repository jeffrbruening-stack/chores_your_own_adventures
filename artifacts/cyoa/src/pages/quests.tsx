import { useState } from 'react';
import { useListOpenQuests, useListMyQuestAssignments, useListPendingVerification, getListMyQuestAssignmentsQueryKey, getListOpenQuestsQueryKey, getListPendingVerificationQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { QuestCard } from '@/components/quest-card';
import { Plus } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

export default function Quests() {
  const { activePartyId, currentUser } = useAuth();
  const [location] = useLocation();
  
  // Parse tab from search params or default
  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get('tab') || 'mine';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const isLeader = currentUser?.activePartyId === activePartyId && 
                  // In a real app we'd check party role from useGetHomeData or similar
                  // For now, assuming adults are leaders mostly, or we just rely on API rules
                  currentUser?.userType === 'adult';

  const { data: myQuests, isLoading: loadingMine } = useListMyQuestAssignments(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId && activeTab === 'mine', queryKey: getListMyQuestAssignmentsQueryKey({ partyId: activePartyId! }) } }
  );

  const { data: openQuests, isLoading: loadingOpen } = useListOpenQuests(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId && activeTab === 'open', queryKey: getListOpenQuestsQueryKey({ partyId: activePartyId! }) } }
  );

  // For leaders
  const { data: pendingQuests, isLoading: loadingPending } = useListPendingVerification(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId && activeTab === 'pending' && isLeader, queryKey: getListPendingVerificationQueryKey({ partyId: activePartyId! }) } }
  );

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
          myQuests?.length ? myQuests.map(q => <QuestCard key={q.id} quest={q} />) : <EmptyState text="You have no active quests." />
        )}

        {activeTab === 'open' && (
          loadingOpen ? <LoadingState /> : 
          openQuests?.length ? openQuests.map(q => <QuestCard key={q.id} quest={q} />) : <EmptyState text="No open quests available." />
        )}

        {activeTab === 'pending' && isLeader && (
          loadingPending ? <LoadingState /> : 
          pendingQuests?.length ? pendingQuests.map(q => <QuestCard key={q.id} quest={q} isLeader={true} />) : <EmptyState text="Nothing pending verification." />
        )}
        
        {activeTab === 'all' && isLeader && (
          <div className="text-center text-muted-foreground py-8">
            Filter all quests (Coming soon)
          </div>
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