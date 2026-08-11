import { useAuth } from '@/contexts/auth-context';
import { useListProjects, getListProjectsQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowLeft, Skull, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Projects() {
  const { activePartyId, currentUser } = useAuth();
  
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
                          value={100 - ((project.completedTaskCount / project.totalTaskCount) * 100)} 
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
        <button className="fixed bottom-20 right-4 w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-30">
          <Plus className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}