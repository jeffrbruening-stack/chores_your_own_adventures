import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Star, Coins, Zap, CalendarDays, Trophy, ScrollText, Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import {
  useGetPartyRecap,
  useListPartyMembers,
} from '@workspace/api-client-react';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: '7 DAYS', days: 7 },
  { label: '14 DAYS', days: 14 },
  { label: '30 DAYS', days: 30 },
] as const;

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-1 text-center">
      <div className={cn('flex items-center gap-1.5', accent)}>{icon}<span className="font-pixel text-lg">{value}</span></div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{label}</span>
    </div>
  );
}

/** Format a Date as YYYY-MM-DD for <input type="date"> */
function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Recap() {
  const { activePartyId } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Period mode: preset days or custom range
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [days, setDays] = useState<number>(7);

  const today = toDateInputValue(new Date());
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateInputValue(d);
  });
  const [customEnd, setCustomEnd] = useState<string>(today);

  // Validation for custom range
  const customError = useMemo(() => {
    if (mode !== 'custom') return null;
    if (!customStart || !customEnd) return 'Please pick both a start and end date.';
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (isAfter(s, e)) return 'Start date must be before end date.';
    if (isAfter(e, new Date())) return 'End date cannot be in the future.';
    return null;
  }, [mode, customStart, customEnd]);

  const { from, to } = useMemo(() => {
    if (mode === 'custom' && !customError && customStart && customEnd) {
      return {
        from: startOfDay(new Date(customStart)).toISOString(),
        to: endOfDay(new Date(customEnd)).toISOString(),
      };
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }, [mode, days, customStart, customEnd, customError]);

  const { data: members } = useListPartyMembers(activePartyId!, {
    query: { enabled: !!activePartyId } as any,
  });

  const { data: recap, isLoading } = useGetPartyRecap(
    {
      partyId: activePartyId!,
      ...(selectedUserId ? { userId: selectedUserId } : {}),
      from,
      to,
      tzOffset: new Date().getTimezoneOffset(),
    },
    { query: { enabled: !!activePartyId && (mode === 'preset' || !customError) } as any },
  );

  const maxDayCount = Math.max(1, ...(recap?.byDay ?? []).map((d) => d.count));
  const bestDays = (recap?.byDay ?? [])
    .filter((d) => d.count === maxDayCount && maxDayCount > 0)
    .map((d) => format(new Date(d.date + 'T12:00:00'), 'EEE MMM d'));

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/party">
          <button className="p-2 rounded-xl bg-card border border-border" data-testid="link-back-to-party">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="font-pixel text-sm text-primary">ADVENTURE RECAP</h1>
          <p className="text-xs text-muted-foreground">How the party's been doing</p>
        </div>
      </div>

      {/* Member picker */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setSelectedUserId(null)}
          className={cn(
            'shrink-0 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-colors',
            selectedUserId === null ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground',
          )}
          data-testid="button-recap-whole-party"
        >
          🏰 WHOLE PARTY
        </button>
        {(members ?? []).map((m: any) => (
          <button
            key={m.userId}
            onClick={() => setSelectedUserId(m.userId)}
            className={cn(
              'shrink-0 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-colors',
              selectedUserId === m.userId ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground',
            )}
            data-testid={`button-recap-member-${m.userId}`}
          >
            {m.adventurerName ?? m.displayName}
          </button>
        ))}
      </div>

      {/* Period picker */}
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => { setMode('preset'); setDays(p.days); }}
            className={cn(
              'flex-1 py-2 rounded-xl border-2 font-pixel text-[9px] transition-colors',
              mode === 'preset' && days === p.days
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-muted-foreground',
            )}
            data-testid={`button-recap-days-${p.days}`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setMode('custom')}
          className={cn(
            'flex-1 py-2 rounded-xl border-2 font-pixel text-[9px] transition-colors flex items-center justify-center gap-1',
            mode === 'custom'
              ? 'border-primary text-primary bg-primary/10'
              : 'border-border text-muted-foreground',
          )}
          data-testid="button-recap-custom"
        >
          <Calendar className="w-3 h-3" />
          CUSTOM
        </button>
      </div>

      {/* Custom date range inputs */}
      {mode === 'custom' && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-pixel text-[9px] text-muted-foreground">CHOOSE DATE RANGE</p>
          <div className="flex gap-3 items-start">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">From</label>
              <input
                type="date"
                value={customStart}
                max={today}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                data-testid="input-recap-custom-start"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">To</label>
              <input
                type="date"
                value={customEnd}
                max={today}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                data-testid="input-recap-custom-end"
              />
            </div>
          </div>
          {customError && (
            <p className="text-[10px] text-destructive font-bold" data-testid="recap-custom-error">{customError}</p>
          )}
        </div>
      )}

      {mode === 'custom' && customError ? (
        <div className="bg-card border border-dashed border-border rounded-xl px-4 py-8 text-center">
          <p className="font-pixel text-[10px] text-muted-foreground">PICK A VALID RANGE ABOVE</p>
        </div>
      ) : isLoading || !recap ? (
        <p className="font-pixel text-xs text-muted-foreground animate-pulse text-center py-10">GATHERING TALES...</p>
      ) : (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<Trophy className="w-4 h-4 text-yellow-400" />} label="Quests Done" value={recap.completedCount} />
            <StatCard icon={<ScrollText className="w-4 h-4 text-blue-400" />} label="Completion Rate" value={`${recap.completionRate}%`} />
            <StatCard icon={<Star className="w-4 h-4 text-purple-400" />} label="XP Earned" value={recap.xpEarned} />
            <StatCard icon={<Coins className="w-4 h-4 text-yellow-500" />} label="Gold Earned" value={recap.goldEarned} />
          </div>

          {/* Level ups + most active days */}
          <div className="flex flex-col gap-2">
            {recap.levelUps > 0 && (
              <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-4 py-3">
                <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs">
                  <span className="font-bold text-yellow-400">{recap.levelUps} level-up{recap.levelUps > 1 ? 's' : ''}</span> in this period!
                  {recap.currentLevel != null && <span className="text-muted-foreground"> Now Level {recap.currentLevel}.</span>}
                </p>
              </div>
            )}
            {bestDays.length > 0 && (
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Most active: <span className="font-bold text-foreground">{bestDays.slice(0, 3).join(', ')}</span> ({maxDayCount} quest{maxDayCount > 1 ? 's' : ''})
                </p>
              </div>
            )}
          </div>

          {/* Quest log */}
          <div className="flex flex-col gap-2">
            <h2 className="font-pixel text-[10px] text-muted-foreground">COMPLETED QUESTS</h2>
            {recap.questsCompleted.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl px-4 py-8 text-center">
                <p className="font-pixel text-[10px] text-muted-foreground">NO QUESTS COMPLETED YET</p>
                <p className="text-xs text-muted-foreground mt-1">This period's tale is still unwritten.</p>
              </div>
            ) : (
              [...recap.questsCompleted].reverse().map((q) => (
                <div key={q.assignmentId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3" data-testid={`recap-quest-${q.assignmentId}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{q.adventureTitle ?? q.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {q.completedAt ? format(new Date(q.completedAt), 'EEE MMM d, h:mm a') : ''}
                      {!selectedUserId && q.userName ? ` · ${q.userName}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[10px] font-bold">
                    <span className="text-purple-400 flex items-center gap-0.5"><Star className="w-3 h-3" />{q.xpAwarded}</span>
                    <span className="text-yellow-500 flex items-center gap-0.5"><Coins className="w-3 h-3" />{q.goldAwarded}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
