import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetMyCharacterQueryKey, getGetHomeDataQueryKey, useGetHomeData } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PixelCharacter, type CharacterAppearance } from '@/components/pixel-character';
import {
  SKIN_TONES, HAIR_COLORS, EYE_COLORS, HAIR_STYLES,
  CLASSES_LIST, FACIAL_HAIR_OPTIONS,
} from '@/components/pixel-character';
import { Dices, Sparkles, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Fantasy name generator (client-side)
const NAME_PREFIXES = ['Aer','Thor','Bran','Lyra','Dwyn','Gar','Zel','Kael','Mira','Tor','Fen','Ash','Bel','Cor','Ith','Fae','Gal','Hav','Tav','Sil','Orn','Riv'];
const NAME_SUFFIXES = ['ion','wyn','den','ara','orn','ith','us','ia','as','en','oc','ar','ela','ard','in','ane','ox','ros','el','mer'];
function generateName(): string {
  const p = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const s = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return p + s;
}

const DEFAULTS: CharacterAppearance = {
  skinTone: 'medium',
  hairStyle: 'short',
  hairColor: 'brown',
  eyeColor: 'brown',
  hasGlasses: false,
  facialHair: 'none',
  species: 'human',
  gender: 'any',
  class: 'fighter',
};

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function CreateCharacter() {
  const { refreshUser, hasCharacter, activePartyId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Detect leader role — leaders have no appearance lock
  const { data: homeData } = useGetHomeData({
    query: { enabled: !!activePartyId, queryKey: getGetHomeDataQueryKey() },
  });
  const isLeader = (homeData as any)?.myRole === 'leader' || (homeData as any)?.myRole === 'founder';

  const [adventurerName, setAdventurerName] = useState('');
  const [appearance, setAppearance] = useState<CharacterAppearance>({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [summoning, setSummoning] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(hasCharacter);

  // On mount: if editing an existing character, hydrate form
  useEffect(() => {
    if (!hasCharacter) { setLoadingExisting(false); return; }
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
    const token = localStorage.getItem('cyoa_token');
    fetch(`${BASE}/api/characters/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(c => {
        if (c && c.adventurerName) {
          setAdventurerName(c.adventurerName);
          setAppearance({
            skinTone: c.skinTone ?? 'medium',
            hairStyle: c.hairStyle ?? 'short',
            hairColor: c.hairColor ?? 'brown',
            eyeColor: c.eyeColor ?? 'brown',
            hasGlasses: c.hasGlasses ?? false,
            facialHair: c.facialHair ?? 'none',
            species: 'human', // species removed for now — everyone is human
            gender: c.gender ?? 'any',
            class: c.class ?? 'fighter',
          });
          if (c.cooldownUntil) setCooldownUntil(new Date(c.cooldownUntil));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false));
  }, [hasCharacter]);

  // Leaders are never on cooldown — they can edit appearance freely
  const onCooldown = !isLeader && cooldownUntil && cooldownUntil > new Date();

  const set = (field: keyof CharacterAppearance) => (val: any) =>
    setAppearance(prev => ({ ...prev, [field]: val }));

  const randomize = useCallback(() => {
    setAdventurerName(generateName());
    setAppearance({
      skinTone: rand(SKIN_TONES).id,
      hairStyle: rand(HAIR_STYLES).id,
      hairColor: rand(HAIR_COLORS).id,
      eyeColor: rand(EYE_COLORS).id,
      hasGlasses: Math.random() < 0.2,
      facialHair: rand(FACIAL_HAIR_OPTIONS).id,
      species: 'human',
      gender: rand(['masculine', 'feminine', 'any']),
      class: rand(CLASSES_LIST).id,
    });
  }, []);

  const handleBeginAdventure = async () => {
    if (!adventurerName.trim()) {
      toast({ title: 'Name your adventurer first!', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/characters/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adventurerName: adventurerName.trim(),
          ...appearance,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error ?? 'Save failed');
      }
      // Generate the custom AI portrait from the saved appearance.
      // Slow (~20-60s) — the "summoning" overlay is shown meanwhile.
      setSummoning(true);
      try {
        const pRes = await fetch(`${BASE}/api/characters/me/portrait`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pRes.ok) {
          const err = await pRes.json().catch(() => ({}));
          console.error('Portrait generation failed:', err);
          toast({
            title: 'Portrait delayed',
            description: 'Your custom portrait couldn\u2019t be summoned right now — use the SUMMON PORTRAIT button on your character page to retry.',
          });
        }
      } catch {
        // Portrait failure is non-fatal; the stock class art is used until retried.
      } finally {
        setSummoning(false);
      }

      // Refresh auth context and invalidate character/home caches so every screen shows the new appearance
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: getGetMyCharacterQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() });
      toast({
        title: 'ADVENTURE BEGINS!',
        description: `Welcome, ${adventurerName.trim()}!`,
        className: 'bg-primary text-primary-foreground font-bold border-none',
      });
      setLocation('/home');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="font-pixel animate-pulse text-primary">LOADING...</p>
      </div>
    );
  }

  if (summoning) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 bg-background text-foreground px-8">
        <PixelCharacter appearance={appearance} size={160} />
        <p className="font-pixel text-primary animate-pulse text-center text-sm">SUMMONING YOUR HERO...</p>
        <p className="text-xs text-muted-foreground text-center">
          A one-of-a-kind portrait is being painted just for {adventurerName || 'your adventurer'}. This takes about half a minute.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4">
        <h1 className="font-pixel text-primary text-lg">
          {hasCharacter ? 'EDIT ADVENTURER' : 'CREATE YOUR ADVENTURER'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hasCharacter
            ? isLeader
              ? 'As a Party Leader, you can update your appearance at any time.'
              : 'Appearance changes are locked for 7 days after saving.'
            : 'Choose wisely — your first appearance is permanent for 7 days.'}
        </p>
      </div>

      {/* Cooldown banner */}
      {onCooldown && (
        <div className="mx-4 mt-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-orange-400 shrink-0" />
          <div>
            <p className="font-pixel text-[10px] text-orange-400">APPEARANCE LOCKED</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unlocks {cooldownUntil!.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 px-4 pt-6">
        {/* Live Preview */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 flex flex-col items-center gap-3">
          <PixelCharacter appearance={appearance} size={240} />
          <div className="text-center">
            <p className="font-pixel text-sm text-primary">{adventurerName || '???'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {CLASSES_LIST.find(c => c.id === appearance.class)?.label ?? 'Fighter'}
            </p>
          </div>
          <button
            onClick={randomize}
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg px-3 py-2"
          >
            <Dices className="w-4 h-4" /> RANDOMIZE
          </button>
        </div>

        {/* Adventurer Name */}
        <Section title="NAME">
          <div className="flex gap-2">
            <input
              type="text"
              value={adventurerName}
              onChange={e => setAdventurerName(e.target.value)}
              placeholder="Enter adventurer name..."
              maxLength={24}
              className="flex-1 bg-background border-2 border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={() => setAdventurerName(generateName())}
              className="bg-secondary text-secondary-foreground border-2 border-border rounded-xl px-3 py-3 text-xs font-bold flex items-center gap-1 hover:border-primary transition-colors"
              title="Generate random name"
            >
              <Dices className="w-4 h-4" />
            </button>
          </div>
        </Section>

        {/* Gender */}
        <Section title="IDENTITY">
          <div className="flex gap-2">
            {[{ id: 'masculine', label: 'Masculine' }, { id: 'feminine', label: 'Feminine' }, { id: 'any', label: 'Any / Other' }].map(g => (
              <OptionButton key={g.id} selected={appearance.gender === g.id} onClick={() => set('gender')(g.id)}>
                {g.label}
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* Species selection removed for now — everyone is human. Bring back in a later version. */}

        {/* Class */}
        <Section title="CLASS">
          <div className="grid grid-cols-3 gap-2">
            {CLASSES_LIST.map(c => (
              <OptionButton key={c.id} selected={appearance.class === c.id} onClick={() => set('class')(c.id)}>
                <span className="text-base">{c.icon}</span>
                <span className="text-[10px]">{c.label}</span>
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* Skin Tone */}
        <Section title="SKIN TONE">
          <div className="flex gap-3 flex-wrap">
            {SKIN_TONES.map(s => (
              <button
                key={s.id}
                onClick={() => set('skinTone')(s.id)}
                title={s.label}
                className={cn(
                  'w-10 h-10 rounded-lg border-4 transition-all',
                  appearance.skinTone === s.id ? 'border-primary scale-110 shadow-lg' : 'border-border'
                )}
                style={{ backgroundColor: s.color }}
              />
            ))}
          </div>
        </Section>

        {/* Hair Style */}
        <Section title="HAIR STYLE">
          <div className="flex gap-2 flex-wrap">
            {HAIR_STYLES.map(h => (
              <OptionButton key={h.id} selected={appearance.hairStyle === h.id} onClick={() => set('hairStyle')(h.id)}>
                {h.label}
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* Hair Color */}
        <Section title="HAIR COLOR">
          <div className="flex gap-3 flex-wrap">
            {HAIR_COLORS.map(h => (
              <button
                key={h.id}
                onClick={() => set('hairColor')(h.id)}
                title={h.label}
                className={cn(
                  'w-10 h-10 rounded-lg border-4 transition-all',
                  appearance.hairColor === h.id ? 'border-primary scale-110 shadow-lg' : 'border-border'
                )}
                style={{ backgroundColor: h.color }}
              />
            ))}
          </div>
        </Section>

        {/* Eye Color */}
        <Section title="EYE COLOR">
          <div className="flex gap-3 flex-wrap">
            {EYE_COLORS.map(e => (
              <button
                key={e.id}
                onClick={() => set('eyeColor')(e.id)}
                title={e.label}
                className={cn(
                  'w-10 h-10 rounded-lg border-4 transition-all',
                  appearance.eyeColor === e.id ? 'border-primary scale-110 shadow-lg' : 'border-border'
                )}
                style={{ backgroundColor: e.color }}
              />
            ))}
          </div>
        </Section>

        {/* Glasses */}
        <Section title="GLASSES">
          <div className="flex gap-2">
            <OptionButton selected={!appearance.hasGlasses} onClick={() => set('hasGlasses')(false)}>None</OptionButton>
            <OptionButton selected={!!appearance.hasGlasses} onClick={() => set('hasGlasses')(true)}>Glasses 🤓</OptionButton>
          </div>
        </Section>

        {/* Facial Hair */}
        <Section title="FACIAL HAIR">
          <div className="flex gap-2 flex-wrap">
            {FACIAL_HAIR_OPTIONS.map(f => (
              <OptionButton key={f.id} selected={appearance.facialHair === f.id} onClick={() => set('facialHair')(f.id)}>
                {f.label}
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* BEGIN ADVENTURE / SAVE */}
        <button
          onClick={handleBeginAdventure}
          disabled={saving || !adventurerName.trim() || !!onCooldown}
          className="w-full bg-primary text-primary-foreground font-pixel py-5 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all flex items-center justify-center gap-3 text-sm shadow-[0_0_20px_rgba(250,204,21,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="animate-pulse">SAVING...</span>
          ) : onCooldown ? (
            <>
              <Lock className="w-5 h-5" />
              APPEARANCE LOCKED
            </>
          ) : hasCharacter ? (
            <>
              <Sparkles className="w-5 h-5" />
              SAVE CHANGES
              <ChevronRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              BEGIN ADVENTURE
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-pixel text-[10px] text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function OptionButton({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50'
      )}
    >
      {children}
    </button>
  );
}
