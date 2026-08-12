/**
 * AI portrait generation — builds a pixel-art portrait prompt from a
 * character's appearance choices, generates it with gpt-image-1 via the
 * Replit AI Integrations proxy, and stores the PNG in object storage.
 */
import { randomUUID } from "crypto";
import { ObjectStorageService } from "./objectStorage.js";

const AI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "";
const AI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

// IDs must match the frontend option lists in pixel-character.tsx
const SKIN: Record<string, string> = {
  light: "pale porcelain skin", "light-medium": "warm light skin",
  medium: "golden tan skin", tan: "honey brown skin",
  dark: "deep brown skin", "very-dark": "dark ebony skin",
  "fantasy-red": "crimson red fantasy skin", "fantasy-blue": "azure blue fantasy skin",
  "fantasy-green": "jade green fantasy skin", "fantasy-pink": "rose pink fantasy skin",
  "fantasy-purple": "violet purple fantasy skin", "fantasy-gray": "stone gray fantasy skin",
  "fantasy-teal": "teal fantasy skin",
};
const HAIR_STYLE: Record<string, string> = {
  bald: "a bald head, no hair", short: "short hair", medium: "medium-length hair",
  long: "long flowing hair", curly: "curly hair", ponytail: "hair in a ponytail",
  mohawk: "a mohawk",
};
const HAIR_COLOR: Record<string, string> = {
  black: "black", "dark-brown": "dark espresso brown", brown: "chestnut brown",
  auburn: "auburn", blonde: "blonde", red: "copper red", gray: "silver gray",
  white: "white", "fantasy-blue": "ocean blue", "fantasy-green": "forest green",
  "fantasy-pink": "cotton-candy pink", "fantasy-purple": "amethyst purple",
  "fantasy-bright-red": "fiery bright red", "fantasy-cyan": "frost cyan",
};
const EYE: Record<string, string> = {
  brown: "brown", hazel: "hazel", green: "green", blue: "blue",
  gray: "gray", black: "black", amber: "amber", violet: "violet",
};
const FACIAL_HAIR: Record<string, string> = {
  none: "", mustache: "a mustache", beard: "a full beard",
};
const CLASS_LOOK: Record<string, string> = {
  wizard: "wizard wearing a wide-brimmed pointed purple wizard hat and ornate purple and gold robes, holding a gnarled wooden staff topped with a glowing purple crystal, purple and gold palette",
  fighter: "knight fighter in ornate silver plate armor with gold filigree, dark red cape and blue tabard, holding a longsword and a blue kite shield with a gold griffin emblem, silver gold blue and red palette",
  ranger: "ranger archer in a green hooded cloak with gold trim over brown leather armor, holding a longbow with a quiver of arrows on the back, forest green and brown palette",
  rogue: "rogue in dark charcoal leather armor with subtle gold trim, dark hood and cloak, twin daggers at the belt, dark grey and gold palette",
  cleric: "cleric in white and gold holy vestments over chainmail with a blue stole decorated with gold suns, holding a flanged mace and a white shield with a golden sun emblem, white gold and blue palette",
  barbarian: "barbarian in fur shoulder pelts and brown leather hide armor with red war paint on the face, fur-lined boots, holding a massive two-handed battle axe, brown and tan palette",
};

export interface PortraitAppearance {
  class: string;
  gender: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  hasGlasses: boolean;
  facialHair: string;
}

export function buildPortraitPrompt(a: PortraitAppearance): string {
  const genderWord = a.gender === "feminine" ? "female" : a.gender === "masculine" ? "male" : "androgynous";
  const classLook = CLASS_LOOK[a.class] ?? CLASS_LOOK.fighter;

  const features: string[] = [];
  features.push(SKIN[a.skinTone] ?? "medium tan skin");
  const style = HAIR_STYLE[a.hairStyle] ?? "short hair";
  if (a.hairStyle === "bald") {
    features.push(style);
  } else {
    features.push(`${HAIR_COLOR[a.hairColor] ?? "brown"} ${style}`);
  }
  features.push(`${EYE[a.eyeColor] ?? "brown"} eyes`);
  if (a.hasGlasses) features.push("wearing round glasses");
  const fh = FACIAL_HAIR[a.facialHair] ?? "";
  if (fh) features.push(fh);
  else if (genderWord === "male") features.push("clean-shaven");

  return `Highly detailed 16-bit SNES-era JRPG pixel art character sprite, full body, front-facing, confident heroic pose, a ${genderWord} human ${classLook}. The character has ${features.join(", ")}. The face, hair and features must be clearly visible. Fine pixel resolution with intricate shading, rich color depth and crisp pixel clusters — NOT chunky low-res 8-bit style. Dark outline, single character centered on a plain solid very dark navy background (#101020), no text, no border.`;
}

/** Generates the portrait PNG and uploads it to object storage.
 *  Returns the object path (e.g. "/objects/portraits/<uuid>.png"). */
export async function generateAndStorePortrait(a: PortraitAppearance): Promise<string> {
  const prompt = buildPortraitPrompt(a);

  const resp = await fetch(`${AI_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1536", n: 1 }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Image generation failed: ${resp.status} ${body.slice(0, 300)}`);
  }
  const data = (await resp.json()) as any;
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image generation returned no image data");
  const buffer = Buffer.from(b64, "base64");

  const storage = new ObjectStorageService();
  const privateDir = storage.getPrivateObjectDir();
  const objectName = `portraits/${randomUUID()}.png`;
  const fullPath = `${privateDir}/${objectName}`;

  // Parse "/bucket-name/path/prefix" into bucket + object key
  const parts = fullPath.startsWith("/") ? fullPath.slice(1).split("/") : fullPath.split("/");
  const bucketName = parts[0];
  const key = parts.slice(1).join("/");

  const { objectStorageClient } = await import("./objectStorage.js");
  const file = objectStorageClient.bucket(bucketName).file(key);
  await file.save(buffer, { contentType: "image/png" });

  return `/objects/${objectName}`;
}
