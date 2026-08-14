import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetMyCharacterQueryKey, getGetHomeDataQueryKey, useGetHomeData } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { CharacterSprite } from '@/components/character-sprite';
import { CLASSES_LIST } from '@/components/pixel-character';
import { Dices, Sparkles, ChevronRight, Lock, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Fantasy name generator (client-side)
const NAME_PREFIXES = ['Aer','Thor','Bran','Lyra','Dwyn','Gar','Zel','Kael','Mira','Tor','Fen','Ash','Bel','Cor','Ith','Fae','Gal','Hav','Tav','Sil','Orn','Riv'];
const NAME_SUFFIXES = ['ion','wyn','den','ara','orn','ith','us','ia','as','en','oc','ar','ela','ard','in','ane','ox','ros','el','mer'];
function generateName(): string {
  const p = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const s = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return p + s;
}

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Appearance options — ids must match the prompt maps in the API server's pixellabSprite.ts
const BODY_OPTIONS = [
  { id: 'masculine', label: 'Male' },
  { id: 'feminine', label: 'Female' },
];
const SKIN_OPTIONS = [
  { id: 'light',        label: 'Light',      swatch: '#FDDBB4' },
  { id: 'light-medium', label: 'Warm Light', swatch: '#F0C49A' },
  { id: 'medium',       label: 'Tan',        swatch: '#D4956A' },
  { id: 'tan',          label: 'Honey',      swatch: '#C07840' },
  { id: 'dark',         label: 'Brown',      swatch: '#8B5A2B' },
  { id: 'very-dark',    label: 'Deep',       swatch: '#5C3317' },
];
const HAIR_STYLES = [
  { id: 'bald',     label: 'Bald' },
  { id: 'short',    label: 'Short' },
  { id: 'medium',   label: 'Medium' },
  { id: 'long',     label: 'Long' },
  { id: 'curly',    label: 'Curly' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'mohawk',   label: 'Mohawk' },
];
const HAIR_COLORS = [
  { id: 'black',          label: 'Black',   swatch: '#1a1a1a' },
  { id: 'dark-brown',     label: 'Dark Brown', swatch: '#3B2417' },
  { id: 'brown',          label: 'Brown',   swatch: '#6F4E37' },
  { id: 'auburn',         label: 'Auburn',  swatch: '#A52A2A' },
  { id: 'blonde',         label: 'Blonde',  swatch: '#E6C55C' },
  { id: 'red',            label: 'Red',     swatch: '#C1440E' },
  { id: 'gray',           label: 'Gray',    swatch: '#9E9E9E' },
  { id: 'white',          label: 'White',   swatch: '#F5F5F5' },
  { id: 'fantasy-blue',   label: 'Blue',    swatch: '#3B6FD4' },
  { id: 'fantasy-green',  label: 'Green',   swatch: '#2E8B57' },
  { id: 'fantasy-pink',   label: 'Pink',    swatch: '#E75480' },
  { id: 'fantasy-purple', label: 'Purple',  swatch: '#8A2BE2' },
];

interface Appearance {
  gender: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
}

const DEFAULT_APPEARANCE: Appearance = {
  gender: 'masculine',
  skinTone: 'medium',
  hairStyle: 'short',
  hairColor: 'brown',
};

export default function CreateCharacter() {
  const { refreshUser, hasCharacter, activePartyId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: homeData } = useGetHomeData({
    query: { enabled: !!activePartyId, queryKey: getGetHomeDataQueryKey() },
  });
  const isLeader = (homeData as any)?.myRole === 'leader' || (homeData as any)?.myRole === 'adult';

  const [adventurerName, setAdventurerName] = useState('');
  const [appearance, setAppearance] = useState<Appearance>({ ...DEFAULT_APPEARANCE });
  const [charClass, setCharClass] = useState('fighter');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(hasCharacter);
  const [existingCharacter, setExistingCharacter] = useState<any>(null);
  // Fresh preview from this session's generation (data URL via image endpoint refetch)
  const [previewVersion, setPreviewVersion] = useState<string | null>(null);

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
            gender: c.gender === 'feminine' ? 'feminine' : 'masculine',
            skinTone: SKIN_OPTIONS.some(s => s.id === c.skinTone) ? c.skinTone : 'medium',
            hairStyle: HAIR_STYLES.some(h => h.id === c.hairStyle) ? c.hairStyle : 'short',
            hairColor: HAIR_COLORS.some(h => h.id === c.hairColor) ? c.hairColor : 'brown',
          });
          setCharClass(c.class ?? 'fighter');
          setExistingCharacter(c);
          if (c.cooldownUntil) setCooldownUntil(new Date(c.cooldownUntil));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false));
  }, [hasCharacter]);

  const onCooldown = !isLeader && cooldownUntil && cooldownUntil > new Date();

  const randomize = useCallback(() => {
    setAdventurerName(generateName());
    setAppearance({
      gender: rand(BODY_OPTIONS).id,
      skinTone: rand(SKIN_OPTIONS).id,
      hairStyle: rand(HAIR_STYLES).id,
      hairColor: rand(HAIR_COLORS).id,
    });
    setCharClass(rand(CLASSES_LIST).id);
  }, []);

  const handleBeginAdventure = async () => {
    if (!adventurerName.trim()) {
      toast({ title: 'Name your adventurer first!', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const token = localStorage.getItem('cyoa_token');
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
    try {
      const res = await fetch(`${BASE}/api/characters/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adventurerName: adventurerName.trim(),
          class: charClass,
          species: 'human',
          gender: appearance.gender,
          skinTone: appearance.skinTone,
          hairStyle: appearance.hairStyle,
          hairColor: appearance.hairColor,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error ?? 'Save failed');
      }

      // Generate the hero sprite with PixelLab (~5-20s)
      setGenerating(true);
      const gen = await fetch(`${BASE}/api/characters/me/sprite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setGenerating(false);
      if (!gen.ok) {
        const err = await gen.json().catch(() => ({}));
        // Sprite failure isn't fatal — the appearance is saved; doll fallback renders
        toast({
          title: 'Hero saved, but the artist stumbled',
          description: err.error ?? 'Sprite generation failed — try again from your character page.',
          variant: 'destructive',
        });
      }

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
      setGenerating(false);
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
            : 'Choose your look — a pixel artist will draw your hero when you save!'}
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
        {/* Current hero (existing sprite) */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 flex flex-col items-center gap-3">
          {existingCharacter?.spritePath ? (
            <CharacterSprite
              character={{ ...existingCharacter, updatedAt: previewVersion ?? existingCharacter.updatedAt }}
              size={280}
              data-testid="sprite-preview"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-6" data-testid="sprite-preview-placeholder">
              <Wand2 className="w-10 h-10 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center max-w-[240px]">
                Your hero will be drawn by a pixel artist when you save your choices below.
              </p>
            </div>
          )}
          <div className="text-center">
            <p className="font-pixel text-sm text-primary">{adventurerName || '???'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {CLASSES_LIST.find(c => c.id === charClass)?.label ?? 'Fighter'}
            </p>
          </div>
          <button
            onClick={randomize}
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg px-3 py-2"
            data-testid="button-randomize"
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
              data-testid="input-name"
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

        {/* Body */}
        <Section title="BODY">
          <div className="grid grid-cols-2 gap-2">
            {BODY_OPTIONS.map(b => (
              <OptionButton
                key={b.id}
                selected={appearance.gender === b.id}
                onClick={() => setAppearance(prev => ({ ...prev, gender: b.id }))}
                data-testid={`button-body-${b.id}`}
              >
                <span className="text-sm">{b.label}</span>
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* Class */}
        <Section title="CLASS">
          <div className="grid grid-cols-3 gap-2">
            {CLASSES_LIST.map(c => (
              <OptionButton
                key={c.id}
                selected={charClass === c.id}
                onClick={() => setCharClass(c.id)}
                data-testid={`button-class-${c.id}`}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="text-[10px]">{c.label}</span>
              </OptionButton>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Your class decides your hero's armor, colors and weapon in the drawing.
          </p>
        </Section>

        {/* Skin Tone */}
        <Section title="SKIN TONE">
          <div className="flex gap-3 flex-wrap">
            {SKIN_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setAppearance(prev => ({ ...prev, skinTone: s.id }))}
                title={s.label}
                className={cn(
                  'w-14 h-14 rounded-lg border-4 transition-all',
                  appearance.skinTone === s.id ? 'border-primary scale-110 shadow-lg' : 'border-border'
                )}
                style={{ backgroundColor: s.swatch }}
                data-testid={`button-skin-${s.id}`}
              />
            ))}
          </div>
        </Section>

        {/* Hair Style */}
        <Section title="HAIR STYLE">
          <div className="grid grid-cols-4 gap-2">
            {HAIR_STYLES.map(h => (
              <OptionButton
                key={h.id}
                selected={appearance.hairStyle === h.id}
                onClick={() => setAppearance(prev => ({ ...prev, hairStyle: h.id }))}
                data-testid={`button-hair-${h.id}`}
              >
                <span className="text-[11px]">{h.label}</span>
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* Hair Color */}
        {appearance.hairStyle !== 'bald' && (
          <Section title="HAIR COLOR">
            <div className="flex gap-3 flex-wrap">
              {HAIR_COLORS.map(hc => (
                <button
                  key={hc.id}
                  onClick={() => setAppearance(prev => ({ ...prev, hairColor: hc.id }))}
                  title={hc.label}
                  className={cn(
                    'w-11 h-11 rounded-lg border-4 transition-all',
                    appearance.hairColor === hc.id ? 'border-primary scale-110 shadow-lg' : 'border-border'
                  )}
                  style={{ backgroundColor: hc.swatch }}
                  data-testid={`button-haircolor-${hc.id}`}
                />
              ))}
            </div>
          </Section>
        )}

        {/* BEGIN ADVENTURE / SAVE */}
        <button
          onClick={handleBeginAdventure}
          disabled={saving || !adventurerName.trim() || !!onCooldown}
          className="w-full bg-primary text-primary-foreground font-pixel py-5 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all flex items-center justify-center gap-3 text-sm shadow-[0_0_20px_rgba(250,204,21,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="button-save"
        >
          {generating ? (
            <span className="animate-pulse">DRAWING YOUR HERO...</span>
          ) : saving ? (
            <span className="animate-pulse">SAVING...</span>
          ) : onCooldown ? (
            <>
              <Lock className="w-5 h-5" />
              APPEARANCE LOCKED
            </>
          ) : hasCharacter ? (
            <>
              <Sparkles className="w-5 h-5" />
              SAVE & REDRAW HERO
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
        {generating && (
          <p className="text-center text-xs text-muted-foreground -mt-3 animate-pulse">
            The pixel artist is drawing your hero — this takes about 15 seconds…
          </p>
        )}
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
  ...rest
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  'data-testid'?: string;
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
      data-testid={rest['data-testid']}
    >
      {children}
    </button>
  );
}
