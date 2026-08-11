import { useAuth } from '@/contexts/auth-context';
import { useListPartyGoals, getListPartyGoalsQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowLeft, Target, Coins, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function PartyGoals() {
  const { activePartyId, currentUser } = useAuth();
  
  const { data: goalSummary, isLoading } = useListPartyGoals(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId, queryKey: getListPartyGoalsQueryKey({ partyId: activePartyId! }) } }
  );

  const isLeader = currentUser?.userType === 'adult';

  if (!activePartyId) return null;

  const pastGoals = goalSummary?.goals.filter(g => g.status === 'completed' || g.status === 'redeemed') || [];

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/party" className="text-muted-foreground p-1">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-pixel text-yellow-500 flex items-center gap-2">
          PARTY GOALS
        </h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-card rounded-xl"></div>
          </div>
        ) : (
          <>
            <div className="bg-card border-2 border-yellow-500/50 p-6 rounded-xl text-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
              <div className="text-xs font-bold text-muted-foreground mb-2">PARTY GOLD RESERVE</div>
              <div className="font-pixel text-4xl text-yellow-500 flex justify-center items-center gap-3">
                {goalSummary?.reserve || 0} <Coins className="w-8 h-8" />
              </div>
            </div>

            {goalSummary?.activeGoal ? (
              <div>
                <h3 className="font-pixel text-xs text-muted-foreground mb-3">CURRENT GOAL</h3>
                <div className="bg-card border-2 border-border p-5 rounded-xl">
                  <h2 className="font-bold text-lg mb-1">{goalSummary.activeGoal.name}</h2>
                  {goalSummary.activeGoal.description && (
                    <p className="text-sm text-muted-foreground mb-4">{goalSummary.activeGoal.description}</p>
                  )}
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-[10px] font-pixel text-yellow-500">
                      <span>PROGRESS</span>
                      <span>{goalSummary.activeGoal.currentGold} / {goalSummary.activeGoal.targetGold} PG</span>
                    </div>
                    <Progress 
                      value={(goalSummary.activeGoal.currentGold / goalSummary.activeGoal.targetGold) * 100} 
                      indicatorColor="bg-yellow-500" 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">No active goal.</p>
                <p className="text-xs mt-1">Talk to your party leader to set one!</p>
              </div>
            )}

            {pastGoals.length > 0 && (
              <div>
                <h3 className="font-pixel text-xs text-muted-foreground mb-3">PAST ACHIEVEMENTS</h3>
                <div className="flex flex-col gap-3">
                  {pastGoals.map(goal => (
                    <div key={goal.id} className="bg-card border border-border p-4 rounded-xl flex justify-between items-center opacity-70">
                      <div>
                        <div className="font-bold text-sm">{goal.name}</div>
                        <div className="text-[10px] text-muted-foreground font-pixel mt-1">{goal.targetGold} PG</div>
                      </div>
                      <div className="text-green-500 font-pixel text-[10px]">
                        {goal.status === 'redeemed' ? 'REDEEMED' : 'ACHIEVED'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isLeader && (
        <button className="fixed bottom-20 right-4 w-14 h-14 bg-yellow-500 text-yellow-950 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-30">
          <Plus className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}