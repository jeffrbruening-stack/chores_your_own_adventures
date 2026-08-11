import { useAuth } from '@/contexts/auth-context';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, LogOut, User, Settings as SettingsIcon, Volume2, Gamepad2 } from 'lucide-react';
import { useLogout } from '@workspace/api-client-react';

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
        setLocation('/');
      }
    });
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col min-h-screen bg-card text-card-foreground">
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/character" className="text-muted-foreground p-1">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-pixel text-primary flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" /> SETTINGS
        </h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        
        {/* Account */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground mb-3 px-2">ACCOUNT</h2>
          <div className="bg-background rounded-xl border border-border overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold">{currentUser.displayName}</div>
                <div className="text-xs text-muted-foreground">{currentUser.email || 'Kid Account'}</div>
              </div>
            </div>
            
            {currentUser.userType === 'adult' ? (
              <button className="w-full p-4 text-left font-bold text-sm hover:bg-muted transition-colors">
                Change Password
              </button>
            ) : (
              <button className="w-full p-4 text-left font-bold text-sm hover:bg-muted transition-colors">
                Change PIN
              </button>
            )}
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground mb-3 px-2">GAME PREFERENCES</h2>
          <div className="bg-background rounded-xl border border-border overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-bold text-sm">Adventure Mode</div>
                  <div className="text-xs text-muted-foreground">Show fantasy quest titles</div>
                </div>
              </div>
              <div className="w-12 h-6 bg-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-bold text-sm">Sound Effects</div>
                  <div className="text-xs text-muted-foreground">Quest completion sounds</div>
                </div>
              </div>
              <div className="w-12 h-6 bg-muted rounded-full relative">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
              </div>
            </div>
          </div>
        </section>

        <button 
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="mt-8 bg-destructive/10 text-destructive font-bold py-4 rounded-xl border border-destructive/20 flex items-center justify-center gap-2 active:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          SIGN OUT
        </button>
        
        <div className="text-center text-xs text-muted-foreground mt-4 font-mono">
          CYOA v1.0.0
        </div>
      </div>
    </div>
  );
}