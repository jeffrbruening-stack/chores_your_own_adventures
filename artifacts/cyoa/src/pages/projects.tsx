import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useListProjects, useCreateProject, getListProjectsQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowLeft, Skull, Plus, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export default function Projects() {
  const { activePartyId, currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [bossName, setBossName] = useState('');
  const [bossDesc, setBossDesc] = useState('');
  const [bossHp, setBossHp] = useState(10);
  const createProjectMutation = useCreateProject();

  const handleCreateBoss = async () => {
    if (!bossName.trim()) return;
    try {
      await createProjectMutation.mutateAsync({
        data: {
          partyId: activePartyId!,
          name: bossName.trim(),
          description: bossDesc.trim() || undefined,
          projectType: 'boss',
          bossHp,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey({ partyId: activePartyId! }) });
      toast({ title: 'Boss Summoned!', description: `${bossName.trim()} awaits your party.` });
      setShowCreate(false);
      setBossName(''); setBossDesc(''); setBossHp(10);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const { data: projects, isLoading } = useListProjects(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId, queryKey: getListProjectsQueryKey({ partyId: activePartyId! }) } }
  );

  const isLeader = currentUser?.userType === 'adult';

  if (!activePartyId) return null;

  const activeProjects = projects?.filter(p => p.status === 'active') || [];
  const completedProjects = projects?.filter(p => p.status === 'completed') || [];

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/party" className="text-muted-foreground p-1">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-pixel text-red-500 flex items-center gap-2">
          BOSS BATTLES
        </h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-card rounded-xl"></div>
          </div>
        ) : (
          <>
            {activeProjects.length > 0 ? (
              <div className="flex flex-col gap-4">
                {activeProjects.map(project => (
                  <div key={project.id} className="bg-card border-2 border-red-900/50 rounded-xl overflow-hidden relative">
                    {/* Boss Image Placeholder */}
                    <div className="h-32 bg-black/50 bg-[url('/boss-laundry-golem.png')] bg-cover bg-center flex items-end p-4 relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
                      <h2 className="relative z-10 font-pixel text-lg text-white drop-shadow-md">{project.name}</h2>
                    </div>
                    
                    <div className="p-4">
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                      )}
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-pixel text-red-500">
                          <span>BOSS HP</span>
                          <span>{project.totalTaskCount - project.completedTaskCount} LEFT</span>
                        </div>
                        {/* HP Bar goes right to left, so if value is % completed, HP remaining is inverse. 
                            We want an HP bar that depletes. */}
                        <Progress 
                          value={100 - ((project.completedTaskCount / Math.max(1, project.totalTaskCount)) * 100)} 
                          indicatorColor="bg-red-500" 
                          className="h-4 bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <Skull className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">No active boss battles.</p>
                <p className="text-xs mt-1">Peace reigns... for now.</p>
              </div>
            )}

            {completedProjects.length > 0 && (
              <div>
                <h3 className="font-pixel text-xs text-muted-foreground mb-3">DEFEATED BOSSES</h3>
                <div className="grid grid-cols-2 gap-3">
                  {completedProjects.map(project => (
                    <div key={project.id} className="bg-card border border-border rounded-xl p-3 opacity-70 grayscale">
                      <div className="font-bold text-sm line-clamp-2">{project.name}</div>
                      <div className="text-[10px] text-green-500 font-pixel mt-2">DEFEATED</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isLeader && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-30"
          data-testid="button-create-boss"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Create Boss Battle sheet */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div
            className="w-full max-w-md bg-card border-t-2 border-red-900/50 rounded-t-2xl p-5 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-pixel text-sm text-red-500 flex items-center gap-2">
                <Skull className="w-4 h-4" /> SUMMON A BOSS
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground p-1" data-testid="button-close-create-boss">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              A boss battle is a big project your family defeats together. Each blow (task done) knocks off 1 HP.
            </p>
            <label className="text-[10px] font-pixel text-muted-foreground">BOSS NAME</label>
            <input
              value={bossName}
              onChange={e => setBossName(e.target.value)}
              placeholder="The Laundry Golem"
              className="w-full mt-1 mb-3 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              data-testid="input-boss-name"
            />
            <label className="text-[10px] font-pixel text-muted-foreground">WHAT'S THE BIG PROJECT?</label>
            <input
              value={bossDesc}
              onChange={e => setBossDesc(e.target.value)}
              placeholder="Clean out the whole garage"
              className="w-full mt-1 mb-3 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              data-testid="input-boss-description"
            />
            <label className="text-[10px] font-pixel text-muted-foreground">BOSS HP (HOW MANY TASKS TO DEFEAT IT?)</label>
            <div className="flex items-center gap-3 mt-1 mb-5">
              <button onClick={() => setBossHp(h => Math.max(1, h - 1))} className="w-10 h-10 bg-muted rounded-lg font-bold text-lg" data-testid="button-hp-minus">−</button>
              <span className="font-pixel text-lg text-red-500 w-12 text-center" data-testid="text-boss-hp">{bossHp}</span>
              <button onClick={() => setBossHp(h => Math.min(99, h + 1))} className="w-10 h-10 bg-muted rounded-lg font-bold text-lg" data-testid="button-hp-plus">+</button>
            </div>
            <button
              onClick={handleCreateBoss}
              disabled={!bossName.trim() || createProjectMutation.isPending}
              className="w-full bg-red-600 text-white font-pixel py-4 rounded-xl pixel-corners border-b-4 border-r-4 border-red-950 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50 text-sm"
              data-testid="button-summon-boss"
            >
              {createProjectMutation.isPending ? 'SUMMONING...' : 'SUMMON BOSS'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}