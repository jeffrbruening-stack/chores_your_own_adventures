// Integration test page for the GandalfHardcore Character Asset Pack.
// Proves the app can composite layered sprite sheets (skin + hair + clothing + hand item)
// for one male and one female character. No art is generated or redrawn.

const CELL_W = 80;
const CELL_H = 64;
const SCALE = 3;

const asset = (name: string) => `${import.meta.env.BASE_URL}paperdoll/gandalf/${name}`;

interface SpriteStackProps {
  layers: string[]; // file names, bottom first
  col?: number; // frame column in the sheet
  row?: number; // frame row in the sheet
}

function SpriteStack({ layers, col = 0, row = 0 }: SpriteStackProps) {
  return (
    <div
      style={{ width: CELL_W * SCALE, height: CELL_H * SCALE, position: "relative" }}
      data-testid="sprite-stack"
    >
      {layers.map((name) => (
        <div
          key={name}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${asset(name)})`,
            backgroundPosition: `-${col * CELL_W * SCALE}px -${row * CELL_H * SCALE}px`,
            backgroundSize: `${800 * SCALE}px ${448 * SCALE}px`,
            imageRendering: "pixelated",
          }}
        />
      ))}
    </div>
  );
}

const MALE_LAYERS = [
  "male-skin1.png",
  "male-boots.png",
  "male-pants.png",
  "male-shirt.png",
  "male-hair1.png",
  "male-sword.png",
];

const FEMALE_LAYERS = [
  "female-skin1.png",
  "female-boots.png",
  "female-skirt.png",
  "female-corset.png",
  "female-hair1.png",
  "female-sword.png",
];

export default function PaperdollPreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#181828",
        color: "#eee",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        padding: 32,
      }}
    >
      <h1 style={{ fontSize: 20 }}>Paper Doll Integration Test — Gandalf Pack</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <SpriteStack layers={MALE_LAYERS} />
          <div data-testid="text-male-label">Male: skin + boots + pants + shirt + hair + sword</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <SpriteStack layers={FEMALE_LAYERS} />
          <div data-testid="text-female-label">Female: skin + boots + skirt + corset + hair + sword</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <SpriteStack layers={MALE_LAYERS} col={1} row={0} />
          <div>Male: frame col 1</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <SpriteStack layers={FEMALE_LAYERS} col={1} row={0} />
          <div>Female: frame col 1</div>
        </div>
      </div>
    </div>
  );
}
