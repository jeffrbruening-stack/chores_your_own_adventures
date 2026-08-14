import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetHomeDataQueryKey,
  getGetPartyQueryKey,
  getListPartyGoalsQueryKey,
} from '@workspace/api-client-react';
import { PartyPopper, Gift } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { celebrateGoalReached } from '@/lib/celebrate';
import { playTadaSound } from '@/lib/sounds';

interface PartyGoal {
  id: number;
  name: string;
  description?: string | null;
  currentGold?: number | null;
  targetGold: number;
}

// Fire the "goal reached" confetti at most once per goal per session,
// so revisiting Home/Party doesn't replay it endlessly.
function celebrateOncePerSession(goalId: number) {
  const key = `cyoa_goal_reached_${goalId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  celebrateGoalReached();
  playTadaSound();
}

export function PartyGoalCard({
  goal,
  isLeader,
  partyId,
  compact = false,
}: {
  goal: PartyGoal;
  isLeader: boolean;
  partyId: number;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [redeeming, setRedeeming] = useState(false);

  const current = goal.currentGold ?? 0;
  const reached = current >= goal.targetGold;
  const pct = Math.min(100, (current / Math.max(1, goal.targetGold)) * 100);

  const celebrated = useRef(false);
  useEffect(() => {
    if (reached && !celebrated.current) {
      celebrated.current = true;
      celebrateOncePerSession(goal.id);
    }
  }, [reached, goal.id]);

  const handleRedeem = async () => {
    setRedeeming(true);
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/party-goals/${goal.id}/redeem`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to redeem');
      celebrateGoalReached();
      playTadaSound();
      toast({
        title: 'GOAL REDEEMED! 🎉',
        description: `${goal.name} — enjoy your reward!`,
        className: 'bg-yellow-500 text-black font-bold border-none',
      });
      queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPartyQueryKey(partyId) });
      queryClient.invalidateQueries({ queryKey: getListPartyGoalsQueryKey({ partyId }) });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setRedeeming(false);
    }
  };

  if (reached) {
    return (
      <div className="bg-card border-2 border-yellow-400 rounded-xl p-4 relative overflow-hidden shadow-[0_0_20px_rgba(250,204,21,0.25)]">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/15 via-transparent to-yellow-500/15 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <PartyPopper className="w-4 h-4 text-yellow-400" />
            <span className="font-pixel text-[11px] text-yellow-400 animate-pulse">GOAL REACHED!</span>
            <PartyPopper className="w-4 h-4 text-yellow-400 scale-x-[-1]" />
          </div>
          <h4 className={compact ? 'font-pixel text-[11px] text-center mb-1' : 'font-bold text-sm text-center mb-1'}>
            {goal.name}
          </h4>
          <div className="text-center text-[10px] text-muted-foreground font-bold mb-3">
            {current} / {goal.targetGold} GOLD — TARGET HIT!
          </div>
          {isLeader ? (
            <button
              onClick={handleRedeem}
              disabled={redeeming}
              className="w-full bg-yellow-500 text-black font-pixel text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-60"
            >
              <Gift className="w-4 h-4" /> {redeeming ? 'REDEEMING...' : 'REDEEM REWARD'}
            </button>
          ) : (
            <p className="text-center text-xs text-yellow-400/90 font-bold">
              🎉 Your party did it! Ask a grown-up to redeem the reward!
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border-2 border-yellow-900/40 rounded-xl p-4 relative overflow-hidden">
      {compact && (
        <div className="absolute top-0 right-0 bg-yellow-700/80 text-white text-[9px] font-pixel px-2 py-1 rounded-bl-lg">
          PARTY GOAL
        </div>
      )}
      <h4 className={compact ? 'font-pixel text-[11px] text-yellow-400 mb-2' : 'font-bold text-sm mb-2'}>
        {goal.name}
      </h4>
      <Progress value={pct} indicatorColor="bg-yellow-500" className={compact ? 'h-2.5' : 'h-3'} />
      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground font-bold">
        <span>{current} gold saved</span>
        <span>{goal.targetGold} goal</span>
      </div>
    </div>
  );
}
