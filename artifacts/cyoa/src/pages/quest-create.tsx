import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  useCreateQuest, 
  useGenerateAdventureSpeak, 
  useSuggestDifficulty,
  useListPartyMembers,
  getListPartyMembersQueryKey
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Sparkles, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function QuestCreate() {
  const [, setLocation] = useLocation();
  const { activePartyId } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form State
  const [plainTitle, setPlainTitle] = useState('');
  const [adventureTitle, setAdventureTitle] = useState('');
  const [questType, setQuestType] = useState<'individual' | 'open' | 'party'>('open');
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'epic' | 'legendary'>('normal');
  const [isLegendary, setIsLegendary] = useState(false);

  const { data: members } = useListPartyMembers(activePartyId!, { query: { enabled: !!activePartyId, queryKey: getListPartyMembersQueryKey(activePartyId!) } });
  
  const createQuestMutation = useCreateQuest();
  const generateSpeakMutation = useGenerateAdventureSpeak();
  const suggestDiffMutation = useSuggestDifficulty();

  // AI Triggers
  const handleGenerateTitle = () => {
    if (!plainTitle) return;
    setIsGenerating(true);
    generateSpeakMutation.mutate(
      { data: { plainTitle } },
      {
        onSuccess: (res) => {
          setAdventureTitle(res.adventureTitle);
          setIsGenerating(false);
        },
        onError: () => setIsGenerating(false)
      }
    );
  };

  const handleSuggestDiff = () => {
    if (!plainTitle) return;
    suggestDiffMutation.mutate(
      { data: { taskDescription: plainTitle } },
      {
        onSuccess: (res) => {
          setDifficulty(res.difficulty as any);
        }
      }
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!adventureTitle && plainTitle) {
        setAdventureTitle(plainTitle); // fallback
      }
      handleSuggestDiff();
    }
    setStep(s => s + 1);
  };

  const handleSave = () => {
    createQuestMutation.mutate({
      data: {
        partyId: activePartyId!,
        plainTitle,
        adventureTitle: adventureTitle || plainTitle,
        questType,
        difficulty,
        isLegendary,
        assignedUserIds: questType === 'individual' ? assignedUserIds : undefined,
        scheduleType: 'anytime',
      }
    }, {
      onSuccess: () => {
        toast({ title: 'Quest Created!' });
        setLocation('/quests');
      },
      onError: (err: any) => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (!activePartyId) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : setLocation('/quests')} className="text-muted-foreground p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-pixel text-primary">CREATE QUEST</h1>
      </div>

      <div className="p-4 flex-1">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold block">WHAT NEEDS DOING?</label>
              <input 
                type="text" 
                value={plainTitle}
                onChange={e => setPlainTitle(e.target.value)}
                className="w-full bg-input text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Empty the dishwasher"
                autoFocus
              />
            </div>

            <div className="space-y-2 bg-card p-4 rounded-xl border border-border">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold block text-primary">ADVENTURE TITLE (OPTIONAL)</label>
                <button 
                  onClick={handleGenerateTitle}
                  disabled={!plainTitle || isGenerating}
                  className="text-[10px] font-pixel text-purple-400 flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" /> AUTO
                </button>
              </div>
              <input 
                type="text" 
                value={adventureTitle}
                onChange={e => setAdventureTitle(e.target.value)}
                className="w-full bg-input text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Banish the Ceramic Golem"
              />
            </div>

            <button 
              onClick={handleNext}
              disabled={!plainTitle}
              className="w-full mt-4 bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
            >
              NEXT: WHO?
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <h2 className="text-sm font-bold mb-4">WHO IS THIS FOR?</h2>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'open', label: 'OPEN QUEST', desc: 'Anyone can claim it' },
                { id: 'individual', label: 'ASSIGNED', desc: 'Specific adventurers' },
                { id: 'party', label: 'PARTY QUEST', desc: 'Everyone does it together' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setQuestType(t.id as any)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    questType === t.id ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  <div className="font-bold">{t.label}</div>
                  <div className="text-sm text-muted-foreground">{t.desc}</div>
                </button>
              ))}
            </div>

            {questType === 'individual' && members && (
              <div className="space-y-2 mt-4">
                <label className="text-sm font-bold block">ASSIGN TO:</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button
                      key={m.userId}
                      onClick={() => {
                        setAssignedUserIds(prev => 
                          prev.includes(m.userId) ? prev.filter(id => id !== m.userId) : [...prev, m.userId]
                        )
                      }}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm font-bold",
                        assignedUserIds.includes(m.userId) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
                      )}
                    >
                      {m.adventurerName || m.displayName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={handleNext}
              className="w-full mt-8 bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all"
            >
              NEXT: REWARDS
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold">DIFFICULTY & REWARDS</h2>
              {suggestDiffMutation.isPending && (
                <span className="text-xs text-blue-400 flex items-center gap-1"><BrainCircuit className="w-3 h-3 animate-spin"/> AI SUGGESTING...</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {['easy', 'normal', 'hard', 'epic'].map(d => (
                <button
                  key={d}
                  onClick={() => { setDifficulty(d as any); setIsLegendary(false); }}
                  className={cn(
                    "p-3 rounded-xl border-2 text-center uppercase font-bold text-sm transition-all",
                    difficulty === d && !isLegendary ? `border-${d === 'easy' ? 'green' : d === 'normal' ? 'blue' : d === 'hard' ? 'orange' : 'purple'}-500 bg-card` : "border-border bg-background opacity-70"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setIsLegendary(!isLegendary); if(!isLegendary) setDifficulty('legendary'); }}
              className={cn(
                "w-full mt-4 p-4 rounded-xl border-2 text-center uppercase font-pixel text-[10px] transition-all flex items-center justify-center gap-2",
                isLegendary ? "border-yellow-500 bg-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "border-border bg-card text-muted-foreground"
              )}
            >
              <Sparkles className="w-4 h-4" /> LEGENDARY QUEST
            </button>

            <div className="bg-card border border-border p-4 rounded-xl mt-6">
              <h3 className="font-bold text-sm mb-2 text-muted-foreground">PREVIEW</h3>
              <div className="font-bold text-lg">{adventureTitle}</div>
              <div className="text-sm mt-1 uppercase text-primary">
                {isLegendary ? 'LEGENDARY' : difficulty} • {questType}
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={createQuestMutation.isPending}
              className="w-full mt-8 bg-green-500 text-white font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-green-900 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
            >
              {createQuestMutation.isPending ? 'SAVING...' : 'CREATE QUEST'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}