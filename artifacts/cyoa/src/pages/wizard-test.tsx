/**
 * TEMPORARY: Upgraded wizard sprite preview — remove after approval.
 * Route: /wizard-test
 */
import { PixelCharacter } from '@/components/pixel-character';

const SIZES = [60, 80, 192, 240];

const VARIANTS = [
  { label: 'Silver beard • long hair • neutral',    ap: { species: 'human', class: 'wizard', skinTone: 'light',  hairColor: 'silver', hairStyle: 'long',     eyeColor: 'blue',  facialHair: 'beard',    hasGlasses: false, expression: 'neutral'   } },
  { label: 'Dark skin • short hair • happy',         ap: { species: 'human', class: 'wizard', skinTone: 'dark',   hairColor: 'black',  hairStyle: 'short',    eyeColor: 'brown', facialHair: 'none',     hasGlasses: true,  expression: 'happy'     } },
  { label: 'Tan • curly • surprised',                ap: { species: 'human', class: 'wizard', skinTone: 'tan',    hairColor: 'auburn', hairStyle: 'curly',    eyeColor: 'green', facialHair: 'mustache', hasGlasses: false, expression: 'surprised' } },
  { label: 'Medium • ponytail • angry',              ap: { species: 'human', class: 'wizard', skinTone: 'medium', hairColor: 'brown',  hairStyle: 'ponytail', eyeColor: 'hazel', facialHair: 'none',     hasGlasses: false, expression: 'angry'     } },
  { label: 'Fair • medium • wink',                   ap: { species: 'human', class: 'wizard', skinTone: 'fair',   hairColor: 'blonde', hairStyle: 'medium',   eyeColor: 'grey',  facialHair: 'none',     hasGlasses: true,  expression: 'wink'      } },
  { label: 'Deep • bald • thinking',                 ap: { species: 'human', class: 'wizard', skinTone: 'deep',   hairColor: 'white',  hairStyle: 'bald',     eyeColor: 'violet',facialHair: 'beard',    hasGlasses: false, expression: 'thinking'  } },
];

export default function WizardTest() {
  return (
    <div style={{ background: '#1a0a2e', minHeight: '100vh', padding: 24, fontFamily: 'monospace' }}>
      <h1 style={{ color: '#D4B840', fontSize: 16, marginBottom: 4 }}>Wizard Sprite — v2 (48×72 canvas)</h1>
      <p style={{ color: '#888', fontSize: 11, marginBottom: 24 }}>Cape • chest brooch • belt buckle • expression system</p>

      {/* Size comparison row */}
      <section style={{ marginBottom: 32 }}>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 10 }}>Size comparison — silver-haired bearded wizard (neutral)</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap' }}>
          {SIZES.map(sz => (
            <div key={sz} style={{ textAlign: 'center' }}>
              <PixelCharacter appearance={VARIANTS[0].ap} equipped={{}} size={sz} />
              <p style={{ color: '#666', fontSize: 10, marginTop: 4 }}>{sz}px</p>
            </div>
          ))}
        </div>
      </section>

      {/* Expression & variant grid */}
      <section>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 10 }}>Variants at 192px — skin tones, hair styles, expressions</p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {VARIANTS.map((v, i) => (
            <div key={i} style={{ textAlign: 'center', maxWidth: 140 }}>
              <PixelCharacter appearance={v.ap} equipped={{}} size={160} />
              <p style={{ color: '#666', fontSize: 9, marginTop: 4, lineHeight: 1.4 }}>{v.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
