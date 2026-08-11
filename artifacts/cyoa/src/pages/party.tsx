import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  useGetParty,
  useListPartyMembers,
  getGetPartyQueryKey,
  getListPartyMembersQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Shield, Users, Target, Settings as SettingsIcon, Crown, Plus, Coins, X, UserPlus, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PixelCharacter } from '@/components/pixel-character';

export default function Party() {
  const { activePartyId, currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: party, isLoading: partyLoading } = useGetParty(
    activePartyId!,
    { query: { enabled: !!activePartyId, queryKey: getGetPartyQueryKey(activePartyId!) } },
  );
  const { data: members, isLoading: membersLoading } = useListPartyMembers(
    activePartyId!,
    { query: { enabled: !!activePartyId, queryKey: getListPartyMembersQueryKey(activePartyId!) } },
  );

  const isLeader = party?.myRole === 'leader' || party?.myRole === 'founder';
  const activeGoal = (party as any)?.activePartyGoal ?? null;

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const handleAddKid = async () => {
    if (!newDisplayName.trim()) {
      toast({ title: 'Enter a display name', variant: 'destructive' }); return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      toast({ title: 'PIN must be exactly 4 digits', variant: 'destructive' }); return;
    }
    setAddingMember(true);
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/parties/${activePartyId}/members/kid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: newDisplayName.trim(), pin: newPin }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      toast({
        title: '🎉 ADVENTURER JOINED!',
        description: `${newDisplayName.trim()} is ready to quest.`,
        className: 'bg-primary text-primary-foreground border-none font-bold',
      });
      setNewDisplayName('');
      setNewPin('');
      setShowAddMember(false);
      queryClient.invalidateQueries({ queryKey: getListPartyMembersQueryKey(activePartyId!) });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setAddingMember(false);
    }
  };

  if (!activePartyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <p className="font-pixel text-xs text-muted-foreground">NO PARTY FOUND</p>
        <Link href="/register">
          <button className="bg-primary text-primary-foreground font-pixel py-3 px-6 rounded-xl text-xs">CREATE A PARTY</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-pixel text-primary flex items-center gap-2">
          <Shield className="w-5 h-5" /> PARTY
        </h1>
        {isLeader && (
          <Link href="/admin">
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
          </Link>
        )}
      </div>

      <div className="p-4 flex flex-col gap-6">
        {partyLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : party ? (
          <>
            {/* Party info card */}
            <div className="bg-card border-2 border-border rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-5">
                <Shield className="w-32 h-32" />
              </div>
              <h2 className="font-bold text-2xl mb-1">{party.name}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="bg-background/60 px-3 py-1.5 rounded-lg border border-border text-xs font-mono">
                  CODE:{' '}
                  <span className="font-bold tracking-widest text-primary">{party.householdCode}</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-400 font-pixel text-xs">
                  <Coins className="w-3 h-3" /> {(party as any).partyGoldReserve ?? 0}
                </div>
              </div>
            </div>

            {/* PARTY MEMBERS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-pixel text-[10px] text-muted-foreground flex items-center gap-2">
                  <Users className="w-3 h-3" /> PARTY MEMBERS
                </h3>
                {isLeader && (
                  <button
                    onClick={() => setShowAddMember(v => !v)}
                    className="flex items-center gap-1.5 text-[10px] font-pixel text-primary bg-primary/10 border border-primary/30 rounded-lg px-2 py-1.5 hover:bg-primary/20 transition-colors"
                  >
                    {showAddMember ? <X className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                    {showAddMember ? 'CANCEL' : 'ADD MEMBER'}
                  </button>
                )}
              </div>

              {/* Add kid form */}
              {showAddMember && isLeader && (
                <div className="bg-card border-2 border-primary/40 rounded-xl p-4 mb-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                  <p className="font-pixel text-[10px] text-primary">NEW ADVENTURER</p>
                  <input
                    type="text"
                    placeholder="Kid's display name"
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                    className="bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    maxLength={20}
                  />
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="4-digit PIN"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full bg-background border-2 border-border rounded-xl pl-10 pr-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-primary transition-colors"
                      maxLength={4}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">
                    They'll use this PIN to log in. Make it easy for them to remember!
                  </p>
                  <button
                    onClick={handleAddKid}
                    disabled={addingMember || !newDisplayName.trim() || newPin.length !== 4}
                    className="w-full bg-primary text-primary-foreground font-pixel py-3 rounded-xl text-xs disabled:opacity-50 transition-opacity"
                  >
                    {addingMember ? 'JOINING...' : '⚔️ ADD TO PARTY'}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    They'll choose their character on first login with household code{' '}
                    <span className="font-bold text-primary">{party.householdCode}</span>
                  </p>
                </div>
              )}

              {membersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}
                </div>
              ) : !members || members.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
                  No members yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {members.map((member: any) => (
                    <div key={member.userId} className="bg-card border border-border rounded-xl flex items-center gap-4 p-3">
                      {/* Full-appearance pixel character */}
                      <div className="shrink-0">
                        <PixelCharacter
                          appearance={{
                            species:    member.species    ?? 'human',
                            class:      member.class      ?? 'fighter',
                            gender:     member.gender     ?? 'any',
                            skinTone:   member.skinTone   ?? 'medium',
                            hairStyle:  member.hairStyle  ?? 'short',
                            hairColor:  member.hairColor  ?? 'brown',
                            eyeColor:   member.eyeColor   ?? 'brown',
                            hasGlasses: member.hasGlasses ?? false,
                            facialHair: member.facialHair ?? 'none',
                          }}
                          size={80}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm leading-tight truncate">
                            {member.adventurerName || member.displayName}
                          </span>
                          {(member.role === 'leader' || member.role === 'founder') && (
                            <Crown className="w-3 h-3 text-yellow-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{member.displayName}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-pixel text-[10px] text-primary">LVL {member.currentLevel ?? 1}</span>
                          {member.class && (
                            <span className="text-[10px] text-muted-foreground capitalize">{member.class}</span>
                          )}
                          {(member.role === 'leader' || member.role === 'founder') && (
                            <span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                              LEADER
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PARTY GOAL */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-pixel text-[10px] text-muted-foreground flex items-center gap-2">
                  <Target className="w-3 h-3" /> PARTY GOAL
                </h3>
                <Link href="/party-goals">
                  <button className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {isLeader ? 'MANAGE' : 'VIEW'} GOALS
                  </button>
                </Link>
              </div>

              {activeGoal ? (
                <div className="bg-card border-2 border-yellow-900/40 rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-2">{activeGoal.name}</h4>
                  <Progress
                    value={Math.min(100, ((activeGoal.currentGold ?? 0) / Math.max(1, activeGoal.targetGold)) * 100)}
                    indicatorColor="bg-yellow-500"
                    className="h-3"
                  />
                  <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground font-bold">
                    <span>{activeGoal.currentGold ?? 0} gold saved</span>
                    <span>{activeGoal.targetGold} goal</span>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold">No active party goal</p>
                  {isLeader ? (
                    <Link href="/party-goals">
                      <button className="mt-3 text-xs font-bold text-primary hover:underline">
                        Set a goal for your party →
                      </button>
                    </Link>
                  ) : (
                    <p className="text-xs mt-1">Ask your party leader to set a goal!</p>
                  )}
                </div>
              )}
            </div>

            {/* BOSS BATTLES quick link */}
            <Link href="/projects">
              <div className="bg-card border border-red-900/40 rounded-xl p-4 flex items-center justify-between hover:border-red-500/60 transition-colors">
                <div>
                  <div className="font-pixel text-[10px] text-red-400 mb-0.5">BOSS BATTLES</div>
                  <div className="text-xs text-muted-foreground">Tackle big projects as a team</div>
                </div>
                <div className="text-2xl">⚔️</div>
              </div>
            </Link>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Could not load party info.</p>
          </div>
        )}
      </div>
    </div>
  );
}
