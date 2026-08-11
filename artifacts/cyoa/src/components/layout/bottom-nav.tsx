import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Home, Scroll, User, ShoppingBag, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  // Don't show bottom nav on admin/settings/etc if you want, but for now we'll show it everywhere
  // except maybe full screen flows. 
  if (['/', '/login', '/register', '/kid-login', '/forgot-password'].includes(location)) {
    return null;
  }

  const tabs = [
    { name: 'HOME', path: '/home', icon: Home },
    { name: 'QUESTS', path: '/quests', icon: Scroll },
    { name: 'CHARACTER', path: '/character', icon: User },
    { name: 'SHOP', path: '/shop', icon: ShoppingBag },
    { name: 'PARTY', path: '/party', icon: Shield },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-4 border-t-card-border pixel-border px-2 pb-safe">
      <div className="max-w-[430px] mx-auto flex justify-between items-center h-16">
        {tabs.map((tab) => {
          const isActive = location.startsWith(tab.path);
          return (
            <Link 
              key={tab.path} 
              href={tab.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full text-[10px] font-pixel transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5 mb-1", isActive && "fill-primary/20")} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}