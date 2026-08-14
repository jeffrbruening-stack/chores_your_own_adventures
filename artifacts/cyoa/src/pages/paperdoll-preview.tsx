// Integration test page for the GandalfHardcore sprite paper-doll system.
// Renders the shared SpriteDoll component with a spread of bodies, skins,
// special skins, hair, elven ears, and masks. No art is generated or redrawn.
import { SpriteDoll, CLASS_GEAR, type SpriteAppearance } from '@/components/sprite-doll';

const CLASS_SAMPLES: { label: string; charClass: string; sprite: SpriteAppearance }[] =
  Object.keys(CLASS_GEAR).flatMap(charClass => ([
    { label: `${charClass} (male)`,   charClass, sprite: { body: 'male' as const,   skin: 'skin-2', hair: 'male-hair-3',    ears: null, mask: null } },
    { label: `${charClass} (female)`, charClass, sprite: { body: 'female' as const, skin: 'skin-4', hair: 'female-hair-12', ears: null, mask: null } },
  ]));

const SAMPLES: { label: string; sprite: SpriteAppearance }[] = [
  { label: 'Male skin-1 hair-1',        sprite: { body: 'male',   skin: 'skin-1', hair: 'male-hair-1',    ears: null,           mask: null } },
  { label: 'Female skin-3 hair-12',     sprite: { body: 'female', skin: 'skin-3', hair: 'female-hair-12', ears: null,           mask: null } },
  { label: 'Male skin-5 fancy hair',    sprite: { body: 'male',   skin: 'skin-5', hair: 'fancy-hair',     ears: null,           mask: null } },
  { label: 'Female elf ears-2',         sprite: { body: 'female', skin: 'skin-2', hair: 'female-hair-22', ears: 'elven-ears-2', mask: null } },
  { label: 'Male elf ears-4 bald',      sprite: { body: 'male',   skin: 'skin-4', hair: 'bald',           ears: 'elven-ears-4', mask: null } },
  { label: 'Male orc',                  sprite: { body: 'male',   skin: 'orc',    hair: 'male-hair-20',   ears: null,           mask: null } },
  { label: 'Female zombie',             sprite: { body: 'female', skin: 'zombie', hair: 'female-hair-5',  ears: null,           mask: null } },
  { label: 'Male demon',                sprite: { body: 'male',   skin: 'demon',  hair: 'male-hair-8',    ears: null,           mask: null } },
  { label: 'Female devil',              sprite: { body: 'female', skin: 'devil',  hair: 'female-hair-30', ears: null,           mask: null } },
  { label: 'Female ghost',              sprite: { body: 'female', skin: 'ghost',  hair: 'female-hair-18', ears: null,           mask: null } },
  { label: 'Male bandit scarf',         sprite: { body: 'male',   skin: 'skin-2', hair: 'male-hair-15',   ears: null,           mask: 'male-bandit-scarf' } },
  { label: 'Male plague mask',          sprite: { body: 'male',   skin: 'skin-3', hair: 'male-hair-27',   ears: null,           mask: 'male-plague-mask' } },
  { label: 'Female face paint',         sprite: { body: 'female', skin: 'skin-4', hair: 'female-hair-33', ears: null,           mask: 'female-blue-face-paint' } },
  { label: 'Female mask + elf ears',    sprite: { body: 'female', skin: 'skin-1', hair: 'female-hair-9',  ears: 'elven-ears-5', mask: 'female-mask' } },
  { label: 'Male queen hair',           sprite: { body: 'male',   skin: 'skin-3', hair: 'queen-hair',     ears: null,           mask: null } },
  { label: 'Male shield maiden hair',   sprite: { body: 'male',   skin: 'skin-1', hair: 'shield-maiden-hair', ears: 'elven-ears-1', mask: null } },
];

export default function PaperdollPreview() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#181828',
        color: '#eee',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: 32,
      }}
    >
      <h1 style={{ fontSize: 20 }}>Paper Doll Integration Test — SpriteDoll component</h1>
      <h2 style={{ fontSize: 14 }}>Class starting gear</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1100 }}>
        {CLASS_SAMPLES.map(s => (
          <div key={s.label} style={{ textAlign: 'center', width: 160 }}>
            <SpriteDoll sprite={s.sprite} charClass={s.charClass} size={150} />
            <div style={{ fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 14 }}>Appearance layers</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1100 }}>
        {SAMPLES.map(s => (
          <div key={s.label} style={{ textAlign: 'center', width: 200 }}>
            <SpriteDoll sprite={s.sprite} size={180} />
            <div style={{ fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
