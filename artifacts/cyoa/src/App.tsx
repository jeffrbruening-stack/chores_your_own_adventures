import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { AppShell } from '@/components/layout/app-shell';

// Pages
import Landing from '@/pages/landing';
import PaperdollPreview from '@/pages/paperdoll-preview';
import Login from '@/pages/login';
import Register from '@/pages/register';
import KidLogin from '@/pages/kid-login';
import ForgotPassword from '@/pages/forgot-password';
import Home from '@/pages/home';
import Quests from '@/pages/quests';
import QuestCreate from '@/pages/quest-create';
import Character from '@/pages/character';
import Shop from '@/pages/shop';
import Party from '@/pages/party';
import Projects from '@/pages/projects';
import PartyGoals from '@/pages/party-goals';
import SchoolCalendars from '@/pages/school-calendars';
import Admin from '@/pages/admin';
import Settings from '@/pages/settings';
import CreateCharacter from '@/pages/create-character';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ProtectedRouteProps {
  component: React.ComponentType;
  adminOnly?: boolean;
  /** Set true on the /create-character route itself to avoid redirect loop */
  skipCharacterCheck?: boolean;
}

function ProtectedRoute({ component: Component, adminOnly = false, skipCharacterCheck = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, currentUser, hasCharacter } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="font-pixel animate-pulse text-primary">LOADING...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (adminOnly && !currentUser?.isAppAdmin) {
    setLocation('/home');
    return null;
  }

  // Redirect to character creation if character not yet configured
  if (!skipCharacterCheck && !hasCharacter) {
    setLocation('/create-character');
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <AppShell>
      <RoutedErrorBoundary>
        <Switch>
          {/* Public */}
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/kid-login" component={KidLogin} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/paperdoll-preview" component={PaperdollPreview} />

          {/* Character creation — protected but skips char check to avoid loop */}
          <Route path="/create-character">
            <ProtectedRoute component={CreateCharacter} skipCharacterCheck />
          </Route>

          {/* Protected — all require a configured character */}
          <Route path="/home"><ProtectedRoute component={Home} /></Route>
          <Route path="/quests"><ProtectedRoute component={Quests} /></Route>
          <Route path="/quest-create"><ProtectedRoute component={QuestCreate} /></Route>
          <Route path="/character"><ProtectedRoute component={Character} /></Route>
          <Route path="/shop"><ProtectedRoute component={Shop} /></Route>
          <Route path="/party"><ProtectedRoute component={Party} /></Route>
          <Route path="/projects"><ProtectedRoute component={Projects} /></Route>
          <Route path="/party-goals"><ProtectedRoute component={PartyGoals} /></Route>
          <Route path="/school-calendars"><ProtectedRoute component={SchoolCalendars} /></Route>
          <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
          <Route path="/admin"><ProtectedRoute component={Admin} adminOnly /></Route>

          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
