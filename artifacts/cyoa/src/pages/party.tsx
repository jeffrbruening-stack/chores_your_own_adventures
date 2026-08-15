import { useState } from 'react';
import { createPortal } from 'react-dom';
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
import {
  Shield, Users, Target, Settings as SettingsIcon, Crown, Plus,
  Coins, X, UserPlus, Lock, ChevronRight, AlertTriangle, Key, Unlock, ScrollText,
} from 'lucide-react';
import { PartyGoalCard } from '@/components/party-goal-card';

// ─── Manage Party Member Sheet ────────────────────────────────────────────────
import { CharacterSprite } from '@/components/character-sprite';

interface Member {
  userId: number;
  displayName: string;
  adventurerName?: string | null;
  userType?: string | null;
  role?: string | null;
  currentLevel?: number | null;
  cooldownUntil?: string | null;
  species?: string | null;
  class?: string | null;
  gender?: string | null;
  skinTone?: string | null;
  hairStyle?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  hasGlasses?: boolean | null;
  facialHair?: string | null;
  portraitPath?: string | null;
}

interface ManageMemberSheetProps {
  member: Member;
  partyId: number;
  onClose: () => void;
  onRefresh: () => void;
}

function ManageMemberSheet({ member, partyId, onClose, onRefresh }: ManageMemberSheetProps) {
  const { toast } = useToast();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPinReset, setShowPinReset] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
  const token = () => localStorage.getItem('cyoa_token') ?? '';

  const isKid = member.userType === 'kid' || member.role === 'kid';
  const isLocked = member.cooldownUntil && new Date(member.cooldownUntil) > new Date();
  const lockDate = isLocked ? new Date(member.cooldownUntil!).toLocaleDateString() : null;

  const apiPatch = async (body: Record<string, unknown>) => {
    const res = await fetch(`${BASE}/api/parties/${partyId}/members/${member.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed');
  };

  const handleUnlockAppearance = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/api/parties/${partyId}/members/${member.userId}/unlock-appearance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed');
      toast({ title: '🔓 Appearance Unlocked', description: `${member.adventurerName ?? member.displayName} can now edit their look.` });
      onRefresh();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleResetPin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      toast({ title: 'PIN must be 4 digits', variant: 'destructive' }); return;
    }
    if (newPin !== confirmPin) {
      toast({ title: 'PINs do not match', variant: 'destructive' }); return;
    }
    setBusy(true);
    try {
      await apiPatch({ resetPin: newPin });
      toast({ title: '🔑 PIN Reset', description: `New PIN set for ${member.adventurerName ?? member.displayName}.` });
      setNewPin(''); setConfirmPin(''); setShowPinReset(false);
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleChangeRole = async (newRole: string) => {
    setBusy(true);
    try {
      await apiPatch({ role: newRole });
      toast({ title: 'Role Updated', description: `${member.displayName} is now a ${newRole}.` });
      onRefresh();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/api/parties/${partyId}/members/${member.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed');
      toast({ title: 'Member Removed', description: `${member.displayName} has been removed from the party.` });
      onRefresh();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="contents dark game-theme">
      <div className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-150" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-border rounded-t-2xl max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <CharacterSprite character={member as any} size={80} />
            <div>
              <h2 className="font-bold text-base">{member.adventurerName ?? member.displayName}</h2>
              <p className="text-xs text-muted-foreground">{member.displayName}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-pixel text-[10px] text-primary">LVL {member.currentLevel ?? 1}</span>
                <span className="text-[10px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">{member.role}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 pb-10">

          {/* Appearance lock status */}
          <div className="bg-background rounded-xl border border-border p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold">Appearance Lock</span>
              </div>
              {isLocked
                ? <span className="text-xs text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20">Locked until {lockDate}</span>
                : <span className="text-xs text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">Unlocked</span>
              }
            </div>
            {isLocked && (
              <button
                onClick={handleUnlockAppearance}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-pixel text-xs py-3 rounded-xl hover:bg-orange-500/20 transition-colors active:scale-98 disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                UNLOCK APPEARANCE NOW
              </button>
            )}
          </div>

          {/* PIN reset (kids only) */}
          {isKid && (
            <div className="bg-background rounded-xl border border-border p-4 flex flex-col gap-3">
              <button
                onClick={() => setShowPinReset(v => !v)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold">Reset PIN</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showPinReset ? 'rotate-90' : ''}`} />
              </button>
              {showPinReset && (
                <div className="flex flex-col gap-3 pt-2 border-t border-border">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="New 4-digit PIN"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full bg-card border-2 border-border rounded-xl pl-10 pr-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-primary transition-colors"
                      maxLength={4}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="Confirm PIN"
                      value={confirmPin}
                      onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full bg-card border-2 border-border rounded-xl pl-10 pr-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-primary transition-colors"
                      maxLength={4}
                    />
                  </div>
                  <button
                    onClick={handleResetPin}
                    disabled={busy || newPin.length !== 4 || confirmPin.length !== 4}
                    className="w-full bg-primary text-primary-foreground font-pixel text-xs py-3 rounded-xl disabled:opacity-50 transition-opacity"
                  >
                    {busy ? 'SAVING...' : 'SET NEW PIN'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Role change (non-founder members) */}
          {!isKid && (
            <div className="bg-background rounded-xl border border-border p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold">Change Role</span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy || member.role === 'adult'}
                  onClick={() => handleChangeRole('adult')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors disabled:opacity-40 border-border text-muted-foreground hover:border-primary hover:text-primary"
                >
                  ⚔️ Adventurer
                </button>
                <button
                  disabled={busy || member.role === 'leader'}
                  onClick={() => handleChangeRole('leader')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors disabled:opacity-40 border-border text-muted-foreground hover:border-yellow-400 hover:text-yellow-400"
                >
                  👑 Leader
                </button>
              </div>
            </div>
          )}

          {/* Remove member */}
          {!confirmRemove ? (
            <button
              onClick={() => setConfirmRemove(true)}
              className="w-full flex items-center justify-center gap-2 text-red-400 border border-red-400/30 bg-red-400/5 font-pixel text-xs py-3 rounded-xl hover:bg-red-400/10 transition-colors"
            >
              <X className="w-4 h-4" />
              REMOVE FROM PARTY
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-bold">Remove {member.displayName} from the party? This cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleRemove}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {busy ? 'REMOVING...' : 'CONFIRM REMOVE'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main Party Page ──────────────────────────────────────────────────────────

export default function Party() {
  const { activePartyId, currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: party, isLoading: partyLoading } = useGetParty(
    activePartyId!,
    { query: { enabled: !!activePartyId, queryKey: getGetPartyQueryKey(activePartyId!) } },
  );
  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = useListPartyMembers(
    activePartyId!,
    { query: { enabled: !!activePartyId, queryKey: getListPartyMembersQueryKey(activePartyId!) } },
  );

  const isLeader = party?.myRole === 'leader' || party?.myRole === 'founder';
  const activeGoal = (party as any)?.activePartyGoal ?? null;

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [addTab, setAddTab] = useState<'child' | 'adult'>('child');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  // Adult invite state
  const [inviteRole, setInviteRole] = useState<'adult' | 'leader'>('adult');
  const [inviteResult, setInviteResult] = useState<{ token: string; inviteUrl: string; role: string } | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  // Manage member state
  const [managingMember, setManagingMember] = useState<Member | null>(null);

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    setInviteResult(null);
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/parties/${activePartyId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: inviteRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const data = await res.json();
      setInviteResult(data);
    } catch (e: any) {
      toast({ title: 'Error generating invite', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingInvite(false);
    }
  };

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
                <div className="flex items-center gap-2">
                {(isLeader || currentUser?.userType === 'adult') && (
                  <Link href="/recap">
                    <button
                      className="flex items-center gap-1.5 text-[10px] font-pixel text-purple-400 bg-purple-400/10 border border-purple-400/30 rounded-lg px-2 py-1.5 hover:bg-purple-400/20 transition-colors"
                      data-testid="link-recap"
                    >
                      <ScrollText className="w-3 h-3" /> RECAP
                    </button>
                  </Link>
                )}
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
              </div>

              {/* Add member form */}
              {showAddMember && isLeader && (
                <div className="bg-card border-2 border-primary/40 rounded-xl p-4 mb-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex rounded-lg overflow-hidden border border-border">
                    <button
                      onClick={() => { setAddTab('child'); setInviteResult(null); }}
                      className={`flex-1 py-2 text-[10px] font-pixel transition-colors ${addTab === 'child' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                    >
                      ADD CHILD
                    </button>
                    <button
                      onClick={() => { setAddTab('adult'); setInviteResult(null); }}
                      className={`flex-1 py-2 text-[10px] font-pixel transition-colors ${addTab === 'adult' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                    >
                      INVITE ADULT
                    </button>
                  </div>

                  {addTab === 'child' && (
                    <>
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
                      <p className="text-xs text-muted-foreground -mt-1">They'll use this PIN to log in.</p>
                      <button
                        onClick={handleAddKid}
                        disabled={addingMember || !newDisplayName.trim() || newPin.length !== 4}
                        className="w-full bg-primary text-primary-foreground font-pixel py-3 rounded-xl text-xs disabled:opacity-50 transition-opacity"
                      >
                        {addingMember ? 'JOINING...' : '⚔️ ADD TO PARTY'}
                      </button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Household code: <span className="font-bold text-primary">{party.householdCode}</span>
                      </p>
                    </>
                  )}

                  {addTab === 'adult' && (
                    <>
                      <p className="font-pixel text-[10px] text-primary">INVITE ADULT</p>
                      <p className="text-xs text-muted-foreground">Choose the role this adult will have:</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setInviteRole('adult'); setInviteResult(null); }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${inviteRole === 'adult' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                        >
                          ⚔️ Adventurer
                        </button>
                        <button
                          onClick={() => { setInviteRole('leader'); setInviteResult(null); }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${inviteRole === 'leader' ? 'border-yellow-400 bg-yellow-400/10 text-yellow-500' : 'border-border text-muted-foreground'}`}
                        >
                          👑 Party Leader
                        </button>
                      </div>

                      {!inviteResult ? (
                        <button
                          onClick={handleGenerateInvite}
                          disabled={generatingInvite}
                          className="w-full bg-primary text-primary-foreground font-pixel py-4 rounded-xl text-xs disabled:opacity-50 pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all"
                        >
                          {generatingInvite ? 'GENERATING...' : '✉️ CREATE INVITE'}
                        </button>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center flex flex-col gap-1">
                            <p className="font-pixel text-[10px] text-green-400">INVITE READY!</p>
                            <p className="text-xs text-muted-foreground">
                              Send this to {inviteResult.role === 'leader' ? 'a new Party Leader' : 'an adult adventurer'} — valid for 7 days.
                            </p>
                          </div>

                          {/* Primary: native share sheet (iMessage, WhatsApp, AirDrop, etc.) */}
                          {'share' in navigator ? (
                            <button
                              onClick={() => navigator.share({ title: 'Join our Chores Your Own Adventure party!', url: inviteResult.inviteUrl })}
                              className="w-full bg-primary text-primary-foreground font-pixel py-4 rounded-xl text-xs pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all"
                              data-testid="button-share-invite"
                            >
                              📤 SHARE INVITE
                            </button>
                          ) : (
                            /* Fallback: copy to clipboard */
                            <button
                              onClick={() => { navigator.clipboard.writeText(inviteResult.inviteUrl); toast({ title: 'Copied!', description: 'Invite link copied to clipboard.' }); }}
                              className="w-full bg-primary text-primary-foreground font-pixel py-4 rounded-xl text-xs pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all"
                              data-testid="button-copy-invite"
                            >
                              📋 COPY INVITE LINK
                            </button>
                          )}

                          <button
                            onClick={() => setInviteResult(null)}
                            className="text-[10px] text-muted-foreground underline text-center"
                          >
                            Generate a new invite
                          </button>
                        </div>
                      )}
                    </>
                  )}
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
                  {members.map((member: any) => {
                    const isMe = member.userId === currentUser?.id;
                    const tappable = isLeader && !isMe;
                    return (
                      <div
                        key={member.userId}
                        onClick={tappable ? () => setManagingMember(member as Member) : undefined}
                        role={tappable ? 'button' : undefined}
                        className={`bg-card border border-border rounded-xl flex items-center gap-4 p-3 transition-all ${tappable ? 'cursor-pointer active:scale-[0.99] active:brightness-90 hover:border-primary/40' : ''}`}
                      >
                        <div className="shrink-0">
                          <CharacterSprite character={member as any} size={100} />
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
                            {/* Appearance lock indicator */}
                            {member.cooldownUntil && new Date(member.cooldownUntil) > new Date() && (
                              <span className="text-[9px] font-bold bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> LOCKED
                              </span>
                            )}
                          </div>
                        </div>

                        {tappable && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    );
                  })}
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
                <PartyGoalCard goal={activeGoal} isLeader={isLeader} partyId={activePartyId!} />
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

            {/* BOSS BATTLES — hidden until feature is ready */}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Could not load party info.</p>
          </div>
        )}
      </div>

      {/* Manage Party Member sheet */}
      {managingMember && activePartyId && (
        <ManageMemberSheet
          member={managingMember}
          partyId={activePartyId}
          onClose={() => setManagingMember(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: getListPartyMembersQueryKey(activePartyId) });
            refetchMembers();
          }}
        />
      )}
    </div>
  );
}
