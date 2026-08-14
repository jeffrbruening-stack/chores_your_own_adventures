import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useListPartyGoals, getListPartyGoalsQueryKey, useGetParty, getGetPartyQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, Target, Coins, Plus, CheckCircle, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { PartyGoalCard } from '@/components/party-goal-card';

export default function PartyGoals() {
  const { activePartyId, currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goalsRaw, isLoading } = useListPartyGoals(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId, queryKey: getListPartyGoalsQueryKey({ partyId: activePartyId! }) } },
  );

  const { data: party } = useGetParty(
    activePartyId!,
    { query: { enabled: !!activePartyId, queryKey: getGetPartyQueryKey(activePartyId!) } },
  );

  const isLeader = currentUser?.userType === 'adult';
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', targetGold: '' });
  const [saving, setSaving] = useState(false);

  if (!activePartyId) return null;

  // API returns a raw goals array — handle both shapes safely
  const goals: any[] = Array.isArray(goalsRaw) ? goalsRaw : [];
  const activeGoal = goals.find(g => g.status === 'active') ?? null;
  const availableGoals = goals.filter(g => g.status === 'available' || g.status === 'proposed');
  const pastGoals = goals.filter(g => g.status === 'completed' || g.status === 'redeemed');
  const reserve = (party as any)?.partyGoldReserve ?? 0;

  const handleCreate = async () => {
    if (!form.name.trim() || !form.targetGold) {
      toast({ title: 'Enter a name and target gold', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/party-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          partyId: activePartyId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          targetGold: parseInt(form.targetGold),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      toast({ title: 'GOAL CREATED!', description: form.name, className: 'bg-yellow-500 text-black font-bold border-none' });
      setForm({ name: '', description: '', targetGold: '' });
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: getListPartyGoalsQueryKey({ partyId: activePartyId! }) });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (goalId: number) => {
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/party-goals/${goalId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      queryClient.invalidateQueries({ queryKey: getListPartyGoalsQueryKey({ partyId: activePartyId! }) });
      toast({ title: 'Goal activated!' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/party" className="text-muted-foreground p-1">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-pixel text-yellow-500 flex items-center gap-2">
          <Target className="w-5 h-5" /> PARTY GOALS
        </h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-card rounded-xl" />
            <div className="h-32 bg-card rounded-xl" />
          </div>
        ) : (
          <>
            {/* Gold reserve */}
            <div className="bg-card border-2 border-yellow-500/50 p-6 rounded-xl text-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
              <div className="text-xs font-bold text-muted-foreground mb-2">PARTY GOLD RESERVE</div>
              <div className="font-pixel text-4xl text-yellow-500 flex justify-center items-center gap-3">
                {reserve} <Coins className="w-8 h-8" />
              </div>
            </div>

            {/* Active goal */}
            {activeGoal ? (
              <div>
                <h3 className="font-pixel text-xs text-muted-foreground mb-3">CURRENT GOAL</h3>
                {(activeGoal.currentGold ?? 0) >= activeGoal.targetGold ? (
                  <PartyGoalCard goal={activeGoal} isLeader={isLeader} partyId={activePartyId!} />
                ) : (
                  <div className="bg-card border-2 border-yellow-500/50 p-5 rounded-xl">
                    <h2 className="font-bold text-lg mb-1">{activeGoal.name}</h2>
                    {activeGoal.description && (
                      <p className="text-sm text-muted-foreground mb-4">{activeGoal.description}</p>
                    )}
                    <div className="flex justify-between text-[10px] font-pixel text-yellow-500 mb-2">
                      <span>PROGRESS</span>
                      <span>{activeGoal.currentGold ?? 0} / {activeGoal.targetGold} GOLD</span>
                    </div>
                    <Progress
                      value={((activeGoal.currentGold ?? 0) / Math.max(1, activeGoal.targetGold)) * 100}
                      indicatorColor="bg-yellow-500"
                      className="h-3"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border-2 border-border rounded-xl p-8 text-center">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-pixel text-xs text-muted-foreground">NO ACTIVE GOAL</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isLeader ? 'Create and activate a goal below.' : 'Ask your party leader to set a goal!'}
                </p>
              </div>
            )}

            {/* Available goals */}
            {availableGoals.length > 0 && (
              <div>
                <h3 className="font-pixel text-xs text-muted-foreground mb-3">AVAILABLE GOALS</h3>
                <div className="flex flex-col gap-3">
                  {availableGoals.map((g: any) => (
                    <div key={g.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm">{g.name}</p>
                        {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                        <p className="text-xs text-yellow-400 font-pixel mt-1">Target: {g.targetGold} GOLD</p>
                      </div>
                      {isLeader && !activeGoal && (
                        <button
                          onClick={() => handleActivate(g.id)}
                          className="bg-yellow-600 text-black font-pixel text-[10px] px-3 py-2 rounded-lg shrink-0 hover:bg-yellow-500 transition-colors"
                        >
                          ACTIVATE
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create goal form (leader only) */}
            {isLeader && (
              <div>
                {!creating ? (
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full border-2 border-dashed border-yellow-500/40 rounded-xl py-5 flex items-center justify-center gap-2 text-sm font-pixel text-yellow-500/60 hover:border-yellow-500 hover:text-yellow-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> SET A GOAL FOR YOUR PARTY
                  </button>
                ) : (
                  <div className="bg-card border-2 border-yellow-500/50 rounded-xl p-5 flex flex-col gap-4">
                    <h3 className="font-pixel text-xs text-yellow-500">CREATE PARTY GOAL</h3>
                    <input
                      type="text"
                      placeholder="Goal name (e.g. Ice Cream Adventure)"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    <div className="flex items-center gap-3">
                      <Coins className="w-5 h-5 text-yellow-500 shrink-0" />
                      <input
                        type="number"
                        placeholder="Target gold (e.g. 400)"
                        value={form.targetGold}
                        onChange={e => setForm(f => ({ ...f, targetGold: e.target.value }))}
                        className="flex-1 bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                        min="1"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCreate}
                        disabled={saving}
                        className="flex-1 bg-yellow-600 text-black font-pixel py-3 rounded-xl text-xs disabled:opacity-60 hover:bg-yellow-500 transition-colors"
                      >
                        {saving ? 'SAVING...' : 'SAVE GOAL'}
                      </button>
                      <button
                        onClick={() => { setCreating(false); setForm({ name: '', description: '', targetGold: '' }); }}
                        className="px-5 bg-secondary text-secondary-foreground font-pixel py-3 rounded-xl text-xs"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Past goals */}
            {pastGoals.length > 0 && (
              <div>
                <h3 className="font-pixel text-xs text-muted-foreground mb-3 flex items-center gap-2">
                  <Trophy className="w-3 h-3" /> PAST GOALS
                </h3>
                <div className="flex flex-col gap-2">
                  {pastGoals.map((g: any) => (
                    <div key={g.id} className="bg-card/50 border border-border/50 p-4 rounded-xl flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-muted-foreground">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.targetGold} GOLD</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
