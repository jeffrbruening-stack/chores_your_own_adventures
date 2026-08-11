import { db } from "@workspace/db";
import {
  shopItemsTable, quickQuestsTable, gameConfigTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const quickQuests = [
  { plainTitle: "Clean your room", adventureTitle: "Banish the Chaos Clutter", difficulty: "easy" as const, xpReward: 15, goldReward: 8, partyGoldReward: 3 },
  { plainTitle: "Wash the dishes", adventureTitle: "Purge the Grimy Goblets", difficulty: "easy" as const, xpReward: 15, goldReward: 8, partyGoldReward: 3 },
  { plainTitle: "Take out the trash", adventureTitle: "Vanquish the Rubbish Heap", difficulty: "easy" as const, xpReward: 15, goldReward: 8, partyGoldReward: 3 },
  { plainTitle: "Vacuum the living room", adventureTitle: "Tame the Dust Serpents", difficulty: "normal" as const, xpReward: 25, goldReward: 15, partyGoldReward: 5 },
  { plainTitle: "Do the laundry", adventureTitle: "Conquer the Laundry Golem", difficulty: "normal" as const, xpReward: 25, goldReward: 15, partyGoldReward: 5 },
  { plainTitle: "Mop the floors", adventureTitle: "Cleanse the Ancient Stone Halls", difficulty: "normal" as const, xpReward: 25, goldReward: 15, partyGoldReward: 5 },
  { plainTitle: "Clean the bathroom", adventureTitle: "Defeat the Mold Kraken", difficulty: "hard" as const, xpReward: 50, goldReward: 25, partyGoldReward: 10 },
  { plainTitle: "Organize the garage", adventureTitle: "Sort the Treasure Vault of Doom", difficulty: "hard" as const, xpReward: 50, goldReward: 25, partyGoldReward: 10 },
  { plainTitle: "Deep clean the kitchen", adventureTitle: "Purify the Grease Dragon's Lair", difficulty: "epic" as const, xpReward: 100, goldReward: 50, partyGoldReward: 20 },
  { plainTitle: "Yard work", adventureTitle: "Tame the Wild Outer Wilds", difficulty: "hard" as const, xpReward: 50, goldReward: 25, partyGoldReward: 10 },
  { plainTitle: "Set the table", adventureTitle: "Prepare the Feast Hall", difficulty: "easy" as const, xpReward: 15, goldReward: 8, partyGoldReward: 3 },
  { plainTitle: "Unload the dishwasher", adventureTitle: "Return the Sacred Vessels to their Keep", difficulty: "easy" as const, xpReward: 15, goldReward: 8, partyGoldReward: 3 },
  { plainTitle: "Walk the dog", adventureTitle: "Escort the Loyal Beast on Patrol", difficulty: "normal" as const, xpReward: 25, goldReward: 15, partyGoldReward: 5 },
  { plainTitle: "Feed the pets", adventureTitle: "Nourish your Animal Companions", difficulty: "easy" as const, xpReward: 15, goldReward: 8, partyGoldReward: 3 },
  { plainTitle: "Homework", adventureTitle: "Study the Ancient Scrolls", difficulty: "hard" as const, xpReward: 50, goldReward: 25, partyGoldReward: 10 },
];

const shopItems = [
  // Weapons
  { name: "Wooden Sword", category: "weapon" as const, description: "A trusty beginner's blade", goldPrice: 50, minLevel: 1, emoji: "🗡️" },
  { name: "Steel Longsword", category: "weapon" as const, description: "Forged in the fires of Ironton", goldPrice: 150, minLevel: 5, emoji: "⚔️" },
  { name: "Legendary Excalibur", category: "weapon" as const, description: "A blade of myth and legend", goldPrice: 500, minLevel: 10, emoji: "✨" },
  // Off-hand
  { name: "Wooden Shield", category: "offhand" as const, description: "Simple but sturdy", goldPrice: 40, minLevel: 1, emoji: "🛡️" },
  { name: "Magic Tome", category: "offhand" as const, description: "Crackling with arcane energy", goldPrice: 200, minLevel: 7, emoji: "📖" },
  { name: "Arcane Orb", category: "offhand" as const, description: "Hums with ancient power", goldPrice: 250, minLevel: 8, emoji: "🔮" },
  // Outfits
  { name: "Adventurer's Tunic", category: "outfit" as const, description: "The classic hero look", goldPrice: 60, minLevel: 1, emoji: "👕" },
  { name: "Knight's Plate Armor", category: "outfit" as const, description: "Heavy but glorious", goldPrice: 300, minLevel: 8, emoji: "🛡️" },
  { name: "Mage Robes", category: "outfit" as const, description: "Shimmering with enchantment", goldPrice: 250, minLevel: 6, emoji: "🔮" },
  { name: "Rogue's Leather", category: "outfit" as const, description: "Light and shadow-black", goldPrice: 180, minLevel: 4, emoji: "🦹" },
  // Head
  { name: "Adventurer's Hat", category: "head" as const, description: "Keeps the sun out of your eyes", goldPrice: 40, minLevel: 1, emoji: "🎩" },
  { name: "Crown of Valor", category: "head" as const, description: "Worn by champions", goldPrice: 400, minLevel: 12, emoji: "👑" },
  { name: "Wizard's Hat", category: "head" as const, description: "Pointy and powerful", goldPrice: 180, minLevel: 4, emoji: "🧙" },
  { name: "Ranger's Hood", category: "head" as const, description: "Blends with the forest", goldPrice: 120, minLevel: 3, emoji: "🏹" },
  // Pets
  { name: "Baby Dragon", category: "pet" as const, description: "A tiny fire-breather. Very loyal.", goldPrice: 200, minLevel: 3, emoji: "🐉" },
  { name: "Fluffkin", category: "pet" as const, description: "An adorable magical bunny", goldPrice: 100, minLevel: 1, emoji: "🐰" },
  { name: "Spectral Cat", category: "pet" as const, description: "Phases through walls occasionally", goldPrice: 350, minLevel: 9, emoji: "👻" },
  { name: "Mini Phoenix", category: "pet" as const, description: "Rises from the ashes every Tuesday", goldPrice: 600, minLevel: 15, emoji: "🔥" },
  // Pet accessories
  { name: "Tiny Crown", category: "pet_accessory" as const, description: "Your pet deserves royalty", goldPrice: 80, minLevel: 2, emoji: "👑" },
  { name: "Adventure Pack", category: "pet_accessory" as const, description: "For the well-prepared familiar", goldPrice: 120, minLevel: 4, emoji: "🎒" },
  // Backgrounds
  { name: "Enchanted Forest", category: "background" as const, description: "Dappled light through magical trees", goldPrice: 120, minLevel: 1, emoji: "🌲" },
  { name: "Dragon's Mountain", category: "background" as const, description: "Perched on a volcanic peak", goldPrice: 280, minLevel: 6, emoji: "🌋" },
  { name: "Crystal Caves", category: "background" as const, description: "Glittering underground wonders", goldPrice: 200, minLevel: 4, emoji: "💎" },
  // Effects
  { name: "Sparkle Aura", category: "effect" as const, description: "You literally glitter", goldPrice: 150, minLevel: 2, emoji: "✨" },
  { name: "Storm Clouds", category: "effect" as const, description: "Always dramatically backlit", goldPrice: 300, minLevel: 8, emoji: "⛈️" },
  { name: "Flower Crown", category: "effect" as const, description: "Spring vibes only", goldPrice: 100, minLevel: 1, emoji: "🌸" },
];

async function seed() {
  console.log("Seeding database...");

  // Quick quests (truncate first to avoid duplicates on re-run)
  await db.execute(sql`TRUNCATE TABLE quick_quests RESTART IDENTITY`);
  for (const q of quickQuests) {
    await db.insert(quickQuestsTable).values(q);
  }
  console.log(`✅ Seeded ${quickQuests.length} quick quests`);

  // Shop items
  await db.execute(sql`TRUNCATE TABLE shop_items RESTART IDENTITY CASCADE`);
  for (const item of shopItems) {
    await db.insert(shopItemsTable).values(item);
  }
  console.log(`✅ Seeded ${shopItems.length} shop items`);

  // Game config
  await db.execute(sql`TRUNCATE TABLE game_config RESTART IDENTITY`);
  await db.insert(gameConfigTable).values({
    rewardTable: {},
    levelCurve: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300, 4000, 4800, 5700, 6700],
    catFoleyConfig: { duration: 48, goldBonus: 0.1 },
  });
  console.log("✅ Seeded game config");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(e => {
  console.error("Seed failed:", e);
  process.exit(1);
});
