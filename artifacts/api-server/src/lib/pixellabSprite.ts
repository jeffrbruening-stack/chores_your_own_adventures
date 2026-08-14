/**
 * PixelLab character sprite generation — builds a pixel-art description from a
 * character's appearance choices, generates it with the PixelLab pixflux
 * model, and stores the transparent PNG in object storage.
 */
import { randomUUID } from "crypto";
import { ObjectStorageService } from "./objectStorage.js";

const PIXELLAB_BASE_URL = "https://api.pixellab.ai/v1";
const PIXELLAB_API_KEY = process.env.PIXELLAB_API_KEY ?? "";

// Descriptive phrase maps — ids match the frontend option lists in create-character.tsx
const SKIN: Record<string, string> = {
  light: "pale light skin", "light-medium": "warm light skin",
  medium: "golden tan skin", tan: "honey brown skin",
  dark: "deep brown skin", "very-dark": "dark ebony skin",
};
const HAIR_STYLE: Record<string, string> = {
  bald: "a bald head, no hair", short: "short hair", medium: "medium-length hair",
  long: "long flowing hair", curly: "curly hair", ponytail: "hair tied in a ponytail",
  mohawk: "a mohawk",
};
const HAIR_COLOR: Record<string, string> = {
  black: "black", "dark-brown": "dark brown", brown: "chestnut brown",
  auburn: "auburn", blonde: "blonde", red: "copper red", gray: "silver gray",
  white: "white", "fantasy-blue": "bright blue", "fantasy-green": "forest green",
  "fantasy-pink": "pink", "fantasy-purple": "purple",
};
const CLASS_LOOK: Record<string, string> = {
  wizard: "wizard wearing a pointed purple wizard hat and purple robes, holding a wooden staff with a glowing crystal",
  fighter: "knight fighter in silver plate armor with a blue tabard, holding a longsword and a kite shield",
  ranger: "ranger archer in a green hooded cloak over brown leather armor, holding a longbow, quiver on the back",
  rogue: "rogue in dark leather armor with a hood and a scarf over the face, holding a dagger",
  cleric: "cleric in white and gold holy vestments with a blue stole, holding a mace and a glowing lantern",
  barbarian: "barbarian in fur shoulder pelts and leather hide armor with red war paint, holding a large battle axe",
};

export interface SpriteAppearanceInput {
  class: string;
  gender: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
}

export function buildSpriteDescription(a: SpriteAppearanceInput): string {
  const genderWord = a.gender === "feminine" ? "female" : "male";
  const classLook = CLASS_LOOK[a.class] ?? CLASS_LOOK.fighter;
  const features: string[] = [SKIN[a.skinTone] ?? "golden tan skin"];
  const style = HAIR_STYLE[a.hairStyle] ?? "short hair";
  if (a.hairStyle === "bald") features.push(style);
  else features.push(`${HAIR_COLOR[a.hairColor] ?? "brown"} ${style}`);

  return `full body ${genderWord} human ${classLook}, with ${features.join(", ")}, front-facing standing heroic pose, fantasy RPG character, single character centered, feet at the bottom`;
}

/** Generates the sprite PNG via PixelLab and uploads it to object storage.
 *  Returns the object path (e.g. "/objects/sprites/<uuid>.png"). */
export async function generateAndStoreSprite(a: SpriteAppearanceInput): Promise<string> {
  if (!PIXELLAB_API_KEY) throw new Error("PIXELLAB_API_KEY is not configured");
  const description = buildSpriteDescription(a);

  const resp = await fetch(`${PIXELLAB_BASE_URL}/generate-image-pixflux`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PIXELLAB_API_KEY}`,
    },
    body: JSON.stringify({
      description,
      image_size: { width: 256, height: 256 },
      no_background: true,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`PixelLab generation failed: ${resp.status} ${body.slice(0, 300)}`);
  }
  const data = (await resp.json()) as any;
  const b64 = data.image?.base64;
  if (!b64) throw new Error("PixelLab returned no image data");
  const buffer = Buffer.from(b64, "base64");

  const storage = new ObjectStorageService();
  const privateDir = storage.getPrivateObjectDir();
  const objectName = `sprites/${randomUUID()}.png`;
  const fullPath = `${privateDir}/${objectName}`;

  const parts = fullPath.startsWith("/") ? fullPath.slice(1).split("/") : fullPath.split("/");
  const bucketName = parts[0];
  const key = parts.slice(1).join("/");

  const { objectStorageClient } = await import("./objectStorage.js");
  const file = objectStorageClient.bucket(bucketName).file(key);
  await file.save(buffer, { contentType: "image/png" });

  return `/objects/${objectName}`;
}
