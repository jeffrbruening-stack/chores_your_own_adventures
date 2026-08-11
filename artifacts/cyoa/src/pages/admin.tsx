import { useAuth } from '@/contexts/auth-context';
import { useAdminListUsers, getAdminListUsersQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function Admin() {
  const { currentUser } = useAuth();
  
  const { data: users, isLoading } = useAdminListUsers(
    undefined,
    { query: { enabled: !!currentUser?.isAppAdmin, queryKey: getAdminListUsersQueryKey() } }
  );

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/party" className="text-muted-foreground p-1">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-pixel text-destructive flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> ADMIN
        </h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-xl text-sm font-bold">
          SUPERUSER ACCESS GRANTED
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-card rounded-xl"></div>
            <div className="h-12 bg-card rounded-xl"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <h3 className="font-pixel text-xs text-muted-foreground mb-2">SYSTEM USERS</h3>
            {users?.map(user => (
              <div key={user.id} className="bg-card border border-border p-3 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-bold">{user.displayName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{user.email || 'Kid Account'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-pixel text-primary">LVL {user.currentLevel}</div>
                  <div className="text-[10px] font-bold text-muted-foreground">{user.userType.toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}