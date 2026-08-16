import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useGetMyCharacter, getGetMyCharacterQueryKey, useGetInventory, getGetInventoryQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { type EquippedItems } from '@/components/pixel-character';
import { CharacterSprite } from '@/components/character-sprite';
import type { EquippedSpriteKeys } from '@/components/sprite-doll';
import { Sparkles, Trophy, Settings as SettingsIcon, ShoppingBag, X } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// XP curve (matches backend)
const LEVEL_CURVE = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300, 4000, 4800, 5700, 6700];
function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVEL_CURVE[level - 1] ?? (level * 600);
}

const SLOT_LABELS: Record<string, string> = {
  head: 'HEAD',
  outfit: 'OUTFIT',
  main_hand: 'MAIN HAND',
  off_hand: 'OFF HAND',
  pet: 'PET',
  pet_accessory: 'PET ACC.',
  background: 'BACKDROP',
  effect: 'EFFECT',
};

/** Slots SpriteDoll actually knows how to draw an override for (see sprite-doll.tsx EquippedSpriteKeys). */
const SPRITE_SLOTS = new Set(['head', 'outfit', 'legs', 'main_hand', 'back']);

const SLOT_SHOP_CAT: Record<string, string> = {
  head: 'head',
  outfit: 'outfit',
  main_hand: 'weapon',
  off_hand: 'offhand',
  pet: 'pet',
  pet_accessory: 'pet_accessory',
  background: 'background',
  effect: 'effect',
};

export default function Character() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: character, isLoading: charLoading } = useGetMyCharacter();
  const { data: inventoryData, isLoading: invLoading } = useGetInventory();
  const [unequipping, setUnequipping] = useState<string | null>(null);
  const [summoning, setSummoning] = useState(false);

  // (Re)generate the AI portrait — independent of the appearance edit cooldown
  const handleSummonPortrait = async () => {
    if (summoning) return;
    setSummoning(true);
    try {
      const token = localStorage.getItem('cyoa_token');
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/characters/me/portrait`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'The summoning fizzled. Try again in a bit.');
      }
      await queryClient.invalidateQueries({ queryKey: getGetMyCharacterQueryKey() });
      toast({ title: 'PORTRAIT SUMMONED!', className: 'bg-primary text-primary-foreground font-bold border-none' });
    } catch (e: any) {
      toast({ title: 'Summoning failed', description: e.message, variant: 'destructive' });
    } finally {
      setSummoning(false);
    }
  };

  // Build equipped item map with names, plus the sprite-key subset SpriteDoll
  // needs to actually draw purchased gear on the character.
  const { equippedItems, equippedWithNames, equippedSpriteKeys } = useMemo(() => {
    if (!inventoryData) {
      return { equippedItems: {} as Record<string, any>, equippedWithNames: {} as EquippedItems, equippedSpriteKeys: {} as EquippedSpriteKeys };
    }
    const { items, equipped } = inventoryData as any;
    const equippedItems: Record<string, any> = {};
    const equippedWithNames: EquippedItems = {};
    const equippedSpriteKeys: EquippedSpriteKeys = {};
    if (equipped && items) {
      for (const [slot, itemId] of Object.entries(equipped)) {
        const item = (items as any[]).find((i: any) => i.shopItemId === itemId);
        if (item) {
          equippedItems[slot] = item;
          (equippedWithNames as any)[slot] = { name: item.name, emoji: item.emoji };
          if (item.spriteKey && SPRITE_SLOTS.has(slot)) {
            (equippedSpriteKeys as any)[slot] = item.spriteKey;
          }
        }
      }
    }
    return { equippedItems, equippedWithNames, equippedSpriteKeys };
  }, [inventoryData]);

  const handleUnequip = async (slot: string) => {
    setUnequipping(slot);
    try {
      await fetch(
        `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/inventory/equip/${slot}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('cyoa_token')}` },
        },
      );
      queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
      toast({ title: 'Unequipped', description: `Removed ${SLOT_LABELS[slot]}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to unequip', variant: 'destructive' });
    } finally {
      setUnequipping(null);
    }
  };

  if (charLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel animate-pulse text-primary">LOADING...</p>
      </div>
    );
  }

  const lvl = currentUser.currentLevel;
  const baseXp = xpForLevel(lvl);
  const nextXp = xpForLevel(lvl + 1);
  const range = nextXp - baseXp || 100;
  const earned = (currentUser.lifetimeXp ?? 0) - baseXp;
  const xpPct = Math.min(100, Math.max(2, (earned / range) * 100));

  const cooldownUntil = character?.cooldownUntil ? new Date(character.cooldownUntil) : null;
  const onCooldown = cooldownUntil && cooldownUntil > new Date();
  const cooldownDays = onCooldown
    ? Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/90 backdrop-blur-sm border-b border-border px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-pixel text-primary">CHARACTER</h1>
        <Link href="/settings">
          <SettingsIcon className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* Character display — full sprite + stats */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 flex flex-col items-center gap-4">
          {/* Sprite */}
          <div className="flex items-center justify-center">
            <CharacterSprite character={character as any} equippedSpriteKeys={equippedSpriteKeys} size={220} />
          </div>

          {/* Summon / re-summon AI portrait */}
          <div className="flex justify-center mt-2">
            <button
              onClick={handleSummonPortrait}
              disabled={summoning}
              className="font-pixel text-[10px] px-3 py-2 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-60"
              data-testid="button-summon-portrait"
            >
              {summoning ? 'SUMMONING...' : character?.portraitPath ? 'RE-SUMMON PORTRAIT' : 'SUMMON PORTRAIT'}
            </button>
          </div>

          {/* Identity */}
          <div className="text-center">
            <h2 className="font-bold text-xl">{character?.adventurerName || currentUser.displayName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{currentUser.displayName}</p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="font-pixel text-sm text-primary">LVL {lvl}</span>
              {character?.class && (
                <span className="text-xs font-bold text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded">
                  {character.class}
                </span>
              )}
              {character?.species && (
                <span className="text-xs font-bold text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded">
                  {character.species}
                </span>
              )}
            </div>
          </div>

          {/* XP bar */}
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px] font-pixel text-muted-foreground">
              <span>{currentUser.lifetimeXp ?? 0} XP</span>
              <span>{Math.max(0, (nextXp - (currentUser.lifetimeXp ?? 0)))} TO NEXT</span>
            </div>
            <Progress value={xpPct} indicatorColor="bg-blue-500" className="h-3" />
          </div>

          {/* Edit character button */}
          <Link href="/create-character" className="w-full">
            <button
              disabled={!!onCooldown}
              className={cn(
                'w-full border-2 rounded-xl py-2.5 text-xs font-bold transition-all',
                onCooldown
                  ? 'border-border text-muted-foreground opacity-50 cursor-not-allowed'
                  : 'border-primary text-primary hover:bg-primary/10',
              )}
            >
              {onCooldown ? `EDIT LOCKED (${cooldownDays}d remaining)` : 'EDIT APPEARANCE'}
            </button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border p-4 rounded-xl">
            <div className="text-[10px] font-bold text-muted-foreground mb-1">TOTAL XP</div>
            <div className="font-pixel text-lg text-blue-400">{currentUser.lifetimeXp ?? 0}</div>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl">
            <div className="text-[10px] font-bold text-muted-foreground mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3" /> LEGENDARY
            </div>
            <div className="font-pixel text-lg text-yellow-400">{currentUser.legendaryCompletions ?? 0}</div>
          </div>
        </div>

        {/* Equipment grid */}
        <div>
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> EQUIPMENT
          </h3>

          {invLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(SLOT_LABELS).map(([slot, label]) => {
                const item = equippedItems[slot];
                return (
                  <div
                    key={slot}
                    className={cn(
                      'relative rounded-xl border-2 p-3 flex flex-col items-center gap-2 min-h-[90px] justify-center',
                      item ? 'border-primary bg-primary/5' : 'border-dashed border-border bg-card/50',
                    )}
                  >
                    {item ? (
                      <>
                        {/* Unequip button */}
                        <button
                          onClick={() => handleUnequip(slot)}
                          disabled={unequipping === slot}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                          title="Clear slot"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                        <div className="text-2xl">{item.emoji || '✨'}</div>
                        <div className="text-[10px] font-bold text-center leading-tight line-clamp-2">
                          {item.name}
                        </div>
                        <div className="text-[8px] font-pixel text-primary">{label}</div>
                      </>
                    ) : (
                      <Link href={`/shop?category=${SLOT_SHOP_CAT[slot]}`} className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <ShoppingBag className="w-5 h-5 text-muted-foreground opacity-40" />
                        <div className="text-[9px] font-bold text-muted-foreground text-center">{label}</div>
                        <div className="text-[8px] text-muted-foreground opacity-60">TAP TO SHOP</div>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
