/**
 * CharacterSprite — renders a character's PixelLab-generated sprite PNG.
 * Falls back to the layered SpriteDoll (paper-doll packs) while a character
 * has no generated sprite yet, so existing characters keep rendering.
 */
import { SpriteDoll, spriteFromCharacter } from '@/components/sprite-doll';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function spriteImageUrl(userId: number, cacheKey?: string | null): string {
  return `${BASE}/api/characters/sprite-image/${userId}${cacheKey ? `?v=${encodeURIComponent(cacheKey)}` : ''}`;
}

interface CharacterSpriteProps {
  character?: {
    userId?: number | null;
    spritePath?: string | null;
    updatedAt?: string | Date | null;
    class?: string | null;
  } | null;
  size?: number;
  className?: string;
  'data-testid'?: string;
}

export function CharacterSprite({ character, size = 120, className, ...rest }: CharacterSpriteProps) {
  const testId = rest['data-testid'] ?? 'character-sprite';
  if (character?.spritePath && character?.userId) {
    return (
      <img
        src={spriteImageUrl(character.userId, String(character.updatedAt ?? ''))}
        alt="Character sprite"
        width={size}
        height={size}
        className={className}
        style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
        data-testid={testId}
      />
    );
  }
  return (
    <SpriteDoll
      sprite={spriteFromCharacter(character as any)}
      charClass={character?.class}
      size={size}
      className={className}
      data-testid={testId}
    />
  );
}
