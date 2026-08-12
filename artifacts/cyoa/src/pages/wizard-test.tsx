/**
 * TEMPORARY: Benchmark wizard sprite preview — remove after approval.
 * Route: /wizard-test (added to App.tsx temporarily)
 */
import { PixelCharacter } from '@/components/pixel-character';

const APPEARANCES = [
  { species: 'human', class: 'wizard', skinTone: 'light',   hairColor: 'silver', hairStyle: 'long',    eyeColor: 'blue',  facialHair: 'beard', hasGlasses: false },
  { species: 'human', class: 'wizard', skinTone: 'medium',  hairColor: 'black',  hairStyle: 'short',   eyeColor: 'brown', facialHair: 'none',  hasGlasses: true  },
  { species: 'human', class: 'wizard', skinTone: 'dark',    hairColor: 'auburn', hairStyle: 'curly',   eyeColor: 'green', facialHair: 'mustache', hasGlasses: false },
  { species: 'human', class: 'wizard', skinTone: 'tan',     hairColor: 'blonde', hairStyle: 'ponytail',eyeColor: 'hazel', facialHair: 'none',  hasGlasses: false },
];

const SIZES = [60, 80, 192, 240];

export default function WizardTest() {
  return (
    <div style={{ background: '#1a0a2e', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ color: '#D4B840', fontFamily: 'monospace', fontSize: 18, marginBottom: 16 }}>
        Wizard Benchmark — Pixel Art Sprites
      </h1>

      {/* Size comparison row using variant 0 */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#aaa', fontFamily: 'monospace', fontSize: 13, marginBottom: 12 }}>
          Size comparison (silver-haired bearded wizard)
        </h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          {SIZES.map(sz => (
            <div key={sz} style={{ textAlign: 'center' }}>
              <PixelCharacter appearance={APPEARANCES[0]} equipped={{}} size={sz} />
              <p style={{ color: '#888', fontFamily: 'monospace', fontSize: 11, marginTop: 4 }}>{sz}px</p>
            </div>
          ))}
        </div>
      </section>

      {/* Variant row at 192px */}
      <section>
        <h2 style={{ color: '#aaa', fontFamily: 'monospace', fontSize: 13, marginBottom: 12 }}>
          Appearance variants (192px) — skin, hair style, facial hair, glasses
        </h2>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {APPEARANCES.map((ap, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <PixelCharacter appearance={ap} equipped={{}} size={192} />
              <p style={{ color: '#888', fontFamily: 'monospace', fontSize: 10, marginTop: 4 }}>
                {ap.skinTone} / {ap.hairStyle}<br />
                {ap.facialHair !== 'none' ? ap.facialHair : '—'} {ap.hasGlasses ? '👓' : ''}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
