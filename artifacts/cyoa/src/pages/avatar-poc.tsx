/**
 * avatar-poc.tsx — standalone proof of concept for the layered-sprite avatar
 * renderer. Not linked from nav (same pattern as /paperdoll-preview). Fully
 * self-contained mock state — no auth, no DB, no live app code touched.
 *
 * Kid-safety: every appearance/equipment choice below comes from a fixed
 * enumerated list. There is no free-text input anywhere on this page, and
 * nothing here ever calls a generator.
 */
import { useState } from 'react';
import { AvatarCanvas } from '@/components/avatar-poc/AvatarCanvas';
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from '@/lib/avatar-poc/palette';
import { SHOP_ITEMS, SLOTS, type Slot } from '@/lib/avatar-poc/items';
import type { Appearance, Equipped } from '@/lib/avatar-poc/compositor';
import { cn } from '@/lib/utils';

const STARTING_GP = 50;

export default function AvatarPoc() {
  const [appearance, setAppearance] = useState<Appearance>({
    skinTone: 'medium',
    hairStyle: 'buzzed',
    hairColor: 'brown',
  });
  const [gp, setGp] = useState(STARTING_GP);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<Equipped>({});

  const buy = (itemId: string, price: number) => {
    if (owned.has(itemId) || gp < price) return;
    setGp(g => g - price);
    setOwned(o => new Set(o).add(itemId));
  };

  const toggleEquip = (slot: Slot, itemId: string) => {
    setEquipped(prev => (prev[slot] === itemId ? { ...prev, [slot]: undefined } : { ...prev, [slot]: itemId }));
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground game-theme pb-12">
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4">
        <h1 className="font-pixel text-primary text-base">AVATAR RENDERER — POC</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Layered-sprite compositor · palette swaps · canvas render. Art from the Gandalf paperdoll pack.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-4 pt-6 max-w-md mx-auto">
        {/* Preview + GP */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 flex flex-col items-center gap-4">
          <AvatarCanvas appearance={appearance} equipped={equipped} size={280} />
          <div className="flex items-center gap-4">
            <span className="font-pixel text-primary text-sm" data-testid="text-gp">{gp} GP</span>
            <button
              onClick={() => setGp(g => g + 15)}
              className="bg-primary text-primary-foreground font-pixel text-[10px] px-3 py-2 rounded-lg pixel-corners border-b-2 border-r-2 border-black active:border-b-0 active:border-r-0 active:translate-y-0.5 active:translate-x-0.5 transition-all"
              data-testid="button-add-gp"
            >
              +15 GP (TEST)
            </button>
          </div>
        </div>

        {/* Skin tone */}
        <Section title="SKIN TONE">
          <div className="flex gap-3 flex-wrap">
            {SKIN_TONES.map(s => (
              <button
                key={s.id}
                onClick={() => setAppearance(prev => ({ ...prev, skinTone: s.id }))}
                title={s.label}
                className={cn(
                  'w-12 h-12 rounded-lg border-4 transition-all',
                  appearance.skinTone === s.id ? 'border-primary scale-110 shadow-lg' : 'border-border'
                )}
                style={{ backgroundColor: s.hex }}
                data-testid={`button-skin-${s.id}`}
              />
            ))}
          </div>
        </Section>

        {/* Hair style */}
        <Section title="HAIR STYLE">
          <div className="grid grid-cols-3 gap-2">
            {HAIR_STYLES.map(h => (
              <OptionButton
                key={h.id}
                selected={appearance.hairStyle === h.id}
                onClick={() => setAppearance(prev => ({ ...prev, hairStyle: h.id }))}
                data-testid={`button-hair-${h.id}`}
              >
                {h.label}
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* Hair color */}
        <Section title="HAIR COLOR">
          <div className="flex gap-3 flex-wrap">
            {HAIR_COLORS.map(hc => (
              <button
                key={hc.id}
                onClick={() => setAppearance(prev => ({ ...prev, hairColor: hc.id }))}
                title={hc.label}
                className={cn(
                  'w-10 h-10 rounded-lg border-4 transition-all',
                  appearance.hairColor === hc.id ? 'border-primary scale-110 shadow-lg' : 'border-border'
                )}
                style={{ backgroundColor: hc.hex }}
                data-testid={`button-haircolor-${hc.id}`}
              />
            ))}
          </div>
        </Section>

        {/* Shop */}
        <Section title="SHOP">
          <div className="flex flex-col gap-5">
            {SLOTS.map(slot => (
              <div key={slot.id} className="flex flex-col gap-2">
                <h4 className="text-[10px] font-pixel text-muted-foreground">{slot.label.toUpperCase()}</h4>
                <div className="flex flex-col gap-2">
                  {SHOP_ITEMS.filter(i => i.slot === slot.id).map(item => {
                    const isOwned = owned.has(item.id);
                    const isEquipped = equipped[item.slot] === item.id;
                    const canAfford = gp >= item.price;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2',
                          isEquipped ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        )}
                        data-testid={`item-${item.id}`}
                      >
                        <div>
                          <p className="text-xs font-bold">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.price} GP</p>
                        </div>
                        {isOwned ? (
                          <button
                            onClick={() => toggleEquip(item.slot, item.id)}
                            className={cn(
                              'text-[10px] font-pixel px-3 py-2 rounded-lg border-2 transition-colors',
                              isEquipped
                                ? 'border-primary text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/50'
                            )}
                            data-testid={`button-equip-${item.id}`}
                          >
                            {isEquipped ? 'UNEQUIP' : 'EQUIP'}
                          </button>
                        ) : (
                          <button
                            onClick={() => buy(item.id, item.price)}
                            disabled={!canAfford}
                            className="text-[10px] font-pixel px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                            data-testid={`button-buy-${item.id}`}
                          >
                            BUY
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
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
        'flex items-center justify-center px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all',
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
