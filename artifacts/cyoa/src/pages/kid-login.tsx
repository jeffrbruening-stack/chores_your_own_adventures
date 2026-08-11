import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useLoginKid, useGetHouseholdAdventurers, getGetHouseholdAdventurersQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, User, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function KidLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [householdCode, setHouseholdCode] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const loginMutation = useLoginKid();

  // If code is in local storage, skip step 1 initially
  useEffect(() => {
    const savedCode = localStorage.getItem('cyoa_household');
    if (savedCode && step === 1 && !householdCode) {
      setHouseholdCode(savedCode);
      setStep(2);
    }
  }, []);

  const { data: adventurers, isLoading: loadingAdventurers } = useGetHouseholdAdventurers(householdCode, {
    query: { enabled: step >= 2 && householdCode.length === 6, queryKey: getGetHouseholdAdventurersQueryKey(householdCode) }
  });

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (householdCode.length >= 6) {
      localStorage.setItem('cyoa_household', householdCode.toUpperCase());
      setHouseholdCode(householdCode.toUpperCase());
      setStep(2);
    } else {
      toast({ description: "Household code must be at least 6 characters", variant: "destructive" });
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || pin.length !== 4) return;

    loginMutation.mutate({
      data: { householdCode, userId: selectedUserId, pin }
    }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        setLocation('/home');
      },
      onError: (err: any) => {
        toast({
          title: "Login Failed",
          description: err.message || "Incorrect PIN",
          variant: "destructive"
        });
        setPin(''); // Reset PIN on failure
      }
    });
  };

  const resetFlow = () => {
    if (step === 3) {
      setStep(2);
      setPin('');
    } else if (step === 2) {
      setStep(1);
      localStorage.removeItem('cyoa_household');
    } else {
      setLocation('/');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col p-6 bg-card text-card-foreground">
      <div className="mt-4 mb-8">
        <button onClick={resetFlow} className="text-muted-foreground flex items-center gap-2 font-bold">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-2xl font-pixel text-primary mb-4 text-center">JOIN PARTY</h1>
            <p className="text-center text-muted-foreground mb-8">Enter the 6-character Household Code provided by your party leader.</p>
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <input
                type="text"
                value={householdCode}
                onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                className="w-full bg-input text-foreground text-center text-3xl tracking-widest font-mono font-bold px-4 py-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                maxLength={6}
              />
              <button 
                type="submit"
                disabled={householdCode.length < 6}
                className="w-full bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
              >
                NEXT
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <h1 className="text-xl font-pixel text-primary mb-2 text-center">WHO ARE YOU?</h1>
            <p className="text-center text-muted-foreground mb-8">Select your character</p>
            
            {loadingAdventurers ? (
              <div className="text-center font-pixel animate-pulse">LOADING...</div>
            ) : !adventurers || adventurers.length === 0 ? (
              <div className="text-center">
                <p className="text-destructive mb-4">No adventurers found for this code.</p>
                <button onClick={() => setStep(1)} className="text-primary underline">Try another code</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {adventurers.map(adv => (
                  <button
                    key={adv.id}
                    onClick={() => {
                      setSelectedUserId(adv.id);
                      setStep(3);
                    }}
                    className="bg-background border-2 border-border p-4 rounded-xl flex flex-col items-center gap-3 hover:border-primary transition-colors active:scale-95"
                  >
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center pixel-border text-2xl"
                      style={{ backgroundColor: adv.avatarColor || '#6b21a8' }}
                    >
                      {adv.species === 'cat' ? '🐱' : adv.species === 'dog' ? '🐶' : '🧑'}
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{adv.adventurerName || adv.displayName}</div>
                      <div className="text-xs text-muted-foreground font-pixel mt-1">LVL {adv.level}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <h1 className="text-xl font-pixel text-primary mb-2 text-center">ENTER PIN</h1>
            <p className="text-center text-muted-foreground mb-8">Ask your party leader if you forgot it.</p>
            
            <form onSubmit={handlePinSubmit} className="space-y-6 max-w-[280px] mx-auto">
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full bg-input text-foreground text-center text-4xl tracking-[1em] font-mono font-bold px-4 py-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  maxLength={4}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
              <button 
                type="submit"
                disabled={pin.length !== 4 || loginMutation.isPending}
                className="w-full bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
              >
                {loginMutation.isPending ? '...' : 'ENTER'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}