import { useAuth } from '@/contexts/auth-context';
import { useGetParty, useListPartyMembers, getGetPartyQueryKey, getListPartyMembersQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Shield, Users, Target, CalendarDays, Settings as SettingsIcon, Skull } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Party() {
  const { activePartyId, currentUser } = useAuth();
  
  const { data: party, isLoading: partyLoading } = useGetParty(
    activePartyId!,
    { query: { enabled: !!activePartyId, queryKey: getGetPartyQueryKey(activePartyId!) } }
  );

  const { data: members, isLoading: membersLoading } = useListPartyMembers(
    activePartyId!,
    { query: { enabled: !!activePartyId, queryKey: getListPartyMembersQueryKey(activePartyId!) } }
  );

  const isLeader = party?.myRole === 'leader' || party?.myRole === 'founder';

  if (!activePartyId) return null;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4">
        <h1 className="text-xl font-pixel text-primary flex items-center gap-2">
          <Shield className="w-5 h-5" /> PARTY
        </h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {partyLoading ? (
          <div className="animate-pulse h-32 bg-card rounded-xl"></div>
        ) : party ? (
          <>
            <div className="bg-card border-2 border-border p-4 rounded-xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Shield className="w-32 h-32" />
              </div>
              <h2 className="font-bold text-2xl mb-1">{party.name}</h2>
              <div className="text-sm text-muted-foreground font-mono bg-background w-fit px-2 py-1 rounded">
                CODE: <span className="font-bold tracking-widest text-primary">{party.householdCode}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground">PARTY GOLD</div>
                  <div className="font-pixel text-yellow-500">{party.partyGoldReserve}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground">MEMBERS</div>
                  <div className="font-pixel text-blue-400">{party.memberCount}</div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/projects">
                <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-red-500/50 transition-colors group">
                  <Skull className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">BOSS BATTLES</span>
                </div>
              </Link>
              <Link href="/party-goals">
                <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-yellow-500/50 transition-colors group">
                  <Target className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">PARTY GOALS</span>
                </div>
              </Link>
              {isLeader && (
                <Link href="/school-calendars">
                  <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors group">
                    <CalendarDays className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">ROUTINES</span>
                  </div>
                </Link>
              )}
              {isLeader && (
                <Link href="/admin">
                  <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors group">
                    <SettingsIcon className="w-6 h-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">SETTINGS</span>
                  </div>
                </Link>
              )}
            </div>

            {/* Members List */}
            <div>
              <h3 className="font-pixel text-xs text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> ROSTER
              </h3>
              
              {membersLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-16 bg-card rounded-xl"></div>
                  <div className="h-16 bg-card rounded-xl"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {members?.map(member => (
                    <div key={member.userId} className="bg-card border border-border p-3 rounded-xl flex items-center gap-3">
                      <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center text-2xl pixel-border">
                        {member.species === 'cat' ? '🐱' : member.species === 'dog' ? '🐶' : '🧑'}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold leading-tight">
                          {member.adventurerName || member.displayName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-pixel mt-1">
                          LVL {member.level} {member.role === 'leader' || member.role === 'founder' ? '👑' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}