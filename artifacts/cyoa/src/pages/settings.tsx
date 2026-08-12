import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, LogOut, User, Settings as SettingsIcon, Volume2, Gamepad2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useLogout } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { currentUser, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logoutMutation = useLogout();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
        setLocation('/');
      },
    });
  };

  const handleResetCharacter = async () => {
    setResetting(true);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const token = localStorage.getItem('cyoa_token');
      const res = await fetch(`${BASE}/api/characters/me/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Reset failed');
      await refreshUser();
      toast({
        title: 'Character Reset',
        description: 'You\'re back at level 1. Time to grind again!',
        className: 'bg-card border-primary font-bold',
      });
      setShowResetConfirm(false);
    } catch {
      toast({ title: 'Reset failed', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
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
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
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
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>
        </section>

        {/* Character Reset (adults only — for testing) */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground mb-3 px-2">CHARACTER</h2>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full p-4 text-left flex items-center gap-3 hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-orange-400" />
                <div>
                  <div className="font-bold text-sm text-orange-400">Reset Character Progression</div>
                  <div className="text-xs text-muted-foreground">Return to Level 1 — keeps your appearance</div>
                </div>
              </button>
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">Reset character progression?</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      This resets your level, XP and legendary completions back to zero.
                      Your appearance and gold are kept.
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetCharacter}
                    disabled={resetting}
                    className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold disabled:opacity-50 hover:bg-orange-600 transition-colors"
                  >
                    {resetting ? 'Resetting…' : 'Yes, Reset'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="mt-4 bg-destructive/10 text-destructive font-bold py-4 rounded-xl border border-destructive/20 flex items-center justify-center gap-2 active:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          SIGN OUT
        </button>

        <div className="text-center text-xs text-muted-foreground mt-2 font-mono">
          CYOA v1.0.0
        </div>
      </div>
    </div>
  );
}
