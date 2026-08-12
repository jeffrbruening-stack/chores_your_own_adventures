import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useCreateQuest, 
  useGenerateAdventureSpeak, 
  useSuggestDifficulty,
  useListPartyMembers,
  getListPartyMembersQueryKey,
  getListMyQuestAssignmentsQueryKey,
  getListOpenQuestsQueryKey,
  getGetHomeDataQueryKey,
  getListQuestsQueryKey,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Sparkles, BrainCircuit, RefreshCw, CalendarDays, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_GROUPS = [
  { id: 'weekday', label: 'WEEKDAYS', days: [1, 2, 3, 4, 5] },
  { id: 'weekend', label: 'WEEKEND',  days: [0, 6] },
  { id: 'allweek', label: 'ALL WEEK', days: [0, 1, 2, 3, 4, 5, 6] },
];

const TIME_PRESETS = [
  { id: 'morning',   label: 'MORNING',   range: '5am–12pm', icon: '🌅', start: '05:00', end: '12:00' },
  { id: 'afternoon', label: 'AFTERNOON', range: '12–5pm',   icon: '☀️', start: '12:00', end: '17:00' },
  { id: 'evening',   label: 'EVENING',   range: '5–10pm',   icon: '🌙', start: '17:00', end: '22:00' },
];

export default function QuestCreate() {
  const [, setLocation] = useLocation();
  const { activePartyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Step 1: Title
  const [plainTitle, setPlainTitle] = useState('');
  const [adventureTitle, setAdventureTitle] = useState('');

  // Step 2: Who
  const [questType, setQuestType] = useState<'individual' | 'open' | 'party'>('open');
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);

  // Step 3: Schedule
  const [scheduleType, setScheduleType] = useState<'anytime' | 'date' | 'recurring'>('anytime');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);       // 0=Sun…6=Sat
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);     // multi-select time-of-day presets
  const [timeWindowStart, setTimeWindowStart] = useState('');               // "HH:MM" custom window
  const [timeWindowEnd, setTimeWindowEnd] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');                     // "YYYY-MM-DD"
  const [deadlineTime, setDeadlineTime] = useState('');                     // "HH:MM"

  // Step 4: Difficulty
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'epic' | 'legendary'>('normal');
  const [isLegendary, setIsLegendary] = useState(false);

  const { data: members } = useListPartyMembers(activePartyId!, {
    query: { enabled: !!activePartyId, queryKey: getListPartyMembersQueryKey(activePartyId!) },
  });

  const createQuestMutation = useCreateQuest();
  const generateSpeakMutation = useGenerateAdventureSpeak();
  const suggestDiffMutation = useSuggestDifficulty();

  const totalSteps = 4;

  const handleGenerateTitle = () => {
    if (!plainTitle) return;
    setIsGenerating(true);
    generateSpeakMutation.mutate(
      { data: { plainTitle } },
      {
        onSuccess: (res) => { setAdventureTitle(res.adventureTitle); setIsGenerating(false); },
        onError: () => setIsGenerating(false),
      }
    );
  };

  const handleSuggestDiff = () => {
    if (!plainTitle) return;
    suggestDiffMutation.mutate(
      { data: { taskDescription: plainTitle } },
      { onSuccess: (res) => setDifficulty(res.difficulty as any) }
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!adventureTitle && plainTitle) setAdventureTitle(plainTitle);
    }
    if (step === 3) {
      handleSuggestDiff();
    }
    setStep(s => s + 1);
  };

  const toggleDay = (day: number) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  // Build scheduledDate ISO string from date + time inputs
  const buildScheduledDate = () => {
    if (!deadlineDate) return undefined;
    if (deadlineTime) return `${deadlineDate}T${deadlineTime}:00`;
    return `${deadlineDate}T23:59:00`;
  };

  // Resolve the time windows to create quests for (recurring only).
  // Multiple selected presets → one quest per window, suffixed with its label.
  const resolveTimeWindows = (): { start?: string; end?: string; suffix?: string }[] => {
    if (scheduleType !== 'recurring') return [{}];
    const windows: { start?: string; end?: string; suffix?: string }[] = selectedPresets
      .map(id => TIME_PRESETS.find(p => p.id === id))
      .filter((p): p is typeof TIME_PRESETS[number] => !!p)
      .map(p => ({ start: p.start, end: p.end, suffix: p.label.charAt(0) + p.label.slice(1).toLowerCase() }));
    if (timeWindowStart && timeWindowEnd) {
      windows.push({ start: timeWindowStart, end: timeWindowEnd, suffix: 'Custom' });
    }
    return windows.length > 0 ? windows : [{}];
  };

  const handleSave = async () => {
    // Validation
    if (scheduleType === 'recurring') {
      if (recurrenceDays.length === 0) {
        toast({ title: 'Pick at least one day', description: 'A repeating quest needs days to repeat on.', variant: 'destructive' });
        return;
      }
      if ((timeWindowStart && !timeWindowEnd) || (!timeWindowStart && timeWindowEnd)) {
        toast({ title: 'Incomplete custom time', description: 'Fill in both FROM and TO, or clear both.', variant: 'destructive' });
        return;
      }
      if (timeWindowStart && timeWindowEnd && timeWindowStart === timeWindowEnd) {
        toast({ title: 'Invalid custom time', description: 'FROM and TO can\u2019t be the same time.', variant: 'destructive' });
        return;
      }
    }
    const windows = resolveTimeWindows();
    const multi = windows.length > 1;
    let created = 0;
    try {
      for (const w of windows) {
        const titleSuffix = multi && w.suffix ? ` (${w.suffix})` : '';
        await createQuestMutation.mutateAsync({
          data: {
            partyId: activePartyId!,
            plainTitle: plainTitle + titleSuffix,
            adventureTitle: (adventureTitle || plainTitle) + titleSuffix,
            questType,
            difficulty,
            isLegendary,
            assignedUserIds: questType === 'individual' ? assignedUserIds : undefined,
            scheduleType,
            scheduledDate: scheduleType === 'date' ? buildScheduledDate() : undefined,
            recurrenceDays: scheduleType === 'recurring' ? recurrenceDays : undefined,
            timeWindowStart: w.start,
            timeWindowEnd: w.end,
          } as any,
        });
        created++;
      }
      invalidateQuestCaches();
      toast({ title: multi ? `${windows.length} Quests Created!` : 'Quest Created!' });
      setLocation('/quests');
    } catch (err: any) {
      // Partial failure: some windows may already be created — refresh caches
      // and tell the user exactly what happened so a retry doesn't duplicate.
      invalidateQuestCaches();
      if (created > 0) {
        const doneSuffixes = windows.slice(0, created).map(w => w.suffix).filter(Boolean).join(', ');
        toast({
          title: `Created ${created} of ${windows.length}`,
          description: `${doneSuffixes || created} already created — only re-create the missing one(s). Error: ${err.message}`,
          variant: 'destructive',
        });
        setLocation('/quests');
      } else {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const invalidateQuestCaches = () => {
    queryClient.invalidateQueries({ queryKey: getListMyQuestAssignmentsQueryKey({ partyId: activePartyId! }) });
    queryClient.invalidateQueries({ queryKey: getListOpenQuestsQueryKey({ partyId: activePartyId! }) });
    queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListQuestsQueryKey({ partyId: activePartyId! }) });
  };

  if (!activePartyId) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : setLocation('/quests')}
          className="text-muted-foreground p-1"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-pixel text-primary flex-1">CREATE QUEST</h1>
        <span className="text-xs text-muted-foreground font-mono">{step}/{totalSteps}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-1 bg-primary transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="p-4 flex-1">
        {/* ── Step 1: Title ── */}
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

        {/* ── Step 2: Who ── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <h2 className="text-sm font-bold mb-4">WHO IS THIS FOR?</h2>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'open',       label: 'OPEN QUEST',   desc: 'Anyone can claim it' },
                { id: 'individual', label: 'ASSIGNED',      desc: 'Specific adventurers' },
                { id: 'party',      label: 'PARTY QUEST',  desc: 'Everyone does it together' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setQuestType(t.id as any)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    questType === t.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
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
                      onClick={() => setAssignedUserIds(prev =>
                        prev.includes(m.userId) ? prev.filter(id => id !== m.userId) : [...prev, m.userId]
                      )}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm font-bold',
                        assignedUserIds.includes(m.userId)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border'
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
              NEXT: SCHEDULE
            </button>
          </div>
        )}

        {/* ── Step 3: Schedule ── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <h2 className="text-sm font-bold mb-4">WHEN DOES THIS HAPPEN?</h2>

            {/* Schedule type toggle */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'anytime',   label: 'ANYTIME',    icon: '✦' },
                { id: 'date',      label: 'ONE-TIME',   icon: '📅' },
                { id: 'recurring', label: 'RECURRING',  icon: '🔁' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setScheduleType(t.id)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center transition-all',
                    scheduleType === t.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card opacity-70'
                  )}
                >
                  <div className="text-lg mb-1">{t.icon}</div>
                  <div className="text-[10px] font-pixel font-bold">{t.label}</div>
                </button>
              ))}
            </div>

            {/* One-time: deadline picker */}
            {scheduleType === 'date' && (
              <div className="space-y-4 bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <CalendarDays className="w-4 h-4" /> DEADLINE
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">DATE</label>
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={e => setDeadlineDate(e.target.value)}
                      className="w-full bg-input text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">TIME (OPTIONAL — defaults to end of day)</label>
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={e => setDeadlineTime(e.target.value)}
                      className="w-full bg-input text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Recurring: days + time window */}
            {scheduleType === 'recurring' && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <RefreshCw className="w-4 h-4" /> REPEAT ON
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {DAY_GROUPS.map(g => {
                      const active = g.days.every(d => recurrenceDays.includes(d)) && recurrenceDays.length === g.days.length;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setRecurrenceDays(active ? [] : g.days)}
                          className={cn(
                            'rounded-lg py-1.5 text-[10px] font-bold transition-all border',
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(i)}
                        className={cn(
                          'aspect-square rounded-lg text-[11px] font-bold transition-all',
                          recurrenceDays.includes(i)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {day[0]}
                      </button>
                    ))}
                  </div>
                  {recurrenceDays.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {recurrenceDays.map(d => DAYS[d]).join(', ')}
                    </p>
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <Clock className="w-4 h-4" /> TIME WINDOW (OPTIONAL)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_PRESETS.map(p => {
                      const selected = selectedPresets.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPresets(prev =>
                              prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                            );
                          }}
                          className={cn(
                            'rounded-xl px-2 py-2 text-center transition-all border',
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          <div className="text-sm leading-none mb-1">{p.icon}</div>
                          <div className="text-[11px] font-bold leading-tight">{p.label}</div>
                          <div className="text-[9px] opacity-75 leading-tight">{p.range}</div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pick one or more — e.g. Morning + Evening creates a quest for each time.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">CUSTOM FROM</label>
                      <input
                        type="time"
                        value={timeWindowStart}
                        onChange={e => setTimeWindowStart(e.target.value)}
                        className="w-full bg-input text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">CUSTOM TO</label>
                      <input
                        type="time"
                        value={timeWindowEnd}
                        onChange={e => setTimeWindowEnd(e.target.value)}
                        className="w-full bg-input text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quest should be completed within this window each day it repeats.
                  </p>
                </div>
              </div>
            )}

            {scheduleType === 'anytime' && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No deadline — this quest can be completed whenever.
              </p>
            )}

            <button
              onClick={handleNext}
              disabled={(scheduleType === 'date' && !deadlineDate) || (scheduleType === 'recurring' && recurrenceDays.length === 0)}
              className="w-full mt-4 bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
            >
              NEXT: REWARDS
            </button>
          </div>
        )}

        {/* ── Step 4: Difficulty & Rewards ── */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold">DIFFICULTY & REWARDS</h2>
              {suggestDiffMutation.isPending && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3 animate-spin" /> AI SUGGESTING...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['easy', 'normal', 'hard', 'epic'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => { setDifficulty(d); setIsLegendary(false); }}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center uppercase font-bold text-sm transition-all',
                    difficulty === d && !isLegendary
                      ? `border-${d === 'easy' ? 'green' : d === 'normal' ? 'blue' : d === 'hard' ? 'orange' : 'purple'}-500 bg-card`
                      : 'border-border bg-background opacity-70'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setIsLegendary(!isLegendary); if (!isLegendary) setDifficulty('legendary'); }}
              className={cn(
                'w-full mt-4 p-4 rounded-xl border-2 text-center uppercase font-pixel text-[10px] transition-all flex items-center justify-center gap-2',
                isLegendary
                  ? 'border-yellow-500 bg-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              <Sparkles className="w-4 h-4" /> LEGENDARY QUEST
            </button>

            {/* Preview */}
            <div className="bg-card border border-border p-4 rounded-xl mt-6 space-y-1">
              <h3 className="font-bold text-sm mb-2 text-muted-foreground">PREVIEW</h3>
              <div className="font-bold text-lg">{adventureTitle || plainTitle}</div>
              <div className="text-sm uppercase text-primary">
                {isLegendary ? 'LEGENDARY' : difficulty} • {questType}
              </div>
              {scheduleType === 'recurring' && recurrenceDays.length > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <RefreshCw className="w-3 h-3" />
                  {recurrenceDays.map(d => DAYS[d]).join(', ')}
                  {resolveTimeWindows().filter(w => w.start).map(w => ` • ${w.start}–${w.end}`).join('')}
                </div>
              )}
              {scheduleType === 'date' && deadlineDate && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CalendarDays className="w-3 h-3" />
                  Due {deadlineDate}{deadlineTime ? ` at ${deadlineTime}` : ' (end of day)'}
                </div>
              )}
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
