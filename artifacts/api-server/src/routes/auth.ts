import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  usersTable, partiesTable, partyMembersTable,
  passwordResetTokensTable, charactersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth.js";
import { levelFromXp } from "../lib/rewards.js";

const router = Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: "email, password, displayName required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await db.insert(usersTable).values({
      email, displayName, passwordHash, userType: "adult",
    }).returning();
    // Do NOT auto-create character. User must go through CREATE YOUR ADVENTURER flow.
    const token = signToken({ userId: user.id, userType: "adult" });
    res.status(201).json({ user: await toUserProfile(user.id), token });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }
    const [user] = await db.select().from(usersTable)
      .where(and(eq(usersTable.email, email), eq(usersTable.userType, "adult"))).limit(1);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ userId: user.id, userType: "adult" });
    res.json({ user: await toUserProfile(user.id), token });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, (_req, res) => {
  res.json({ message: "Logged out" });
});

// GET /api/auth/me — includes hasCharacter boolean
router.get("/me", requireAuth, async (req, res) => {
  try {
    const profile = await toUserProfile(req.userId!);
    if (!profile) { res.status(404).json({ error: "User not found" }); return; }
    res.json(profile);
  } catch {
    res.status(500).json({ error: "Failed to get user" });
  }
});

// PATCH /api/auth/me
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const { adventureMode, soundEnabled, hapticsEnabled } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof adventureMode === "boolean") updates.adventureMode = adventureMode;
    if (typeof soundEnabled === "boolean") updates.soundEnabled = soundEnabled;
    if (typeof hapticsEnabled === "boolean") updates.hapticsEnabled = hapticsEnabled;
    await db.update(usersTable).set(updates as any)
      .where(eq(usersTable.id, req.userId!));
    const profile = await toUserProfile(req.userId!);
    res.json(profile);
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const [user] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email)).limit(1);
    // Always respond 200 to avoid email enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.insert(passwordResetTokensTable).values({ userId: user.id, token, expiresAt });
      // In production: send email. For now, log the token.
      console.log(`[PASSWORD RESET] token for userId ${user.id}: ${token}`);
    }
    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [resetToken] = await db.select().from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.token, token)).limit(1);
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      res.status(400).json({ error: "Invalid or expired token" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, resetToken.userId));
    await db.update(passwordResetTokensTable).set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, resetToken.id));
    res.json({ message: "Password reset successfully" });
  } catch {
    res.status(500).json({ error: "Reset failed" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user?.passwordHash) { res.status(400).json({ error: "No password set" }); return; }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) { res.status(401).json({ error: "Current password incorrect" }); return; }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId!));
    res.json({ message: "Password changed" });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/auth/household/:code — list characters in household
router.get("/household/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const [party] = await db.select({ id: partiesTable.id })
      .from(partiesTable).where(eq(partiesTable.householdCode, code.toUpperCase())).limit(1);
    if (!party) { res.status(404).json({ error: "Household not found" }); return; }
    const members = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        userType: usersTable.userType,
        currentLevel: usersTable.currentLevel,
        adventurerName: charactersTable.adventurerName,
        species: charactersTable.species,
        class: charactersTable.class,
        configured: charactersTable.configured,
      })
      .from(partyMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, partyMembersTable.userId))
      .leftJoin(charactersTable, eq(charactersTable.userId, partyMembersTable.userId))
      .where(eq(partyMembersTable.partyId, party.id));
    res.json(members.map(m => ({
      id: m.id, displayName: m.displayName, adventurerName: m.adventurerName,
      userType: m.userType, level: m.currentLevel,
      species: m.species, class: m.class, hasCharacter: !!m.configured,
    })));
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/auth/kid-login
router.post("/kid-login", async (req, res) => {
  try {
    const { householdCode, userId, pin } = req.body;
    const [party] = await db.select({ id: partiesTable.id })
      .from(partiesTable).where(eq(partiesTable.householdCode, householdCode.toUpperCase())).limit(1);
    if (!party) { res.status(404).json({ error: "Household not found" }); return; }
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.id, parseInt(userId))).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    // Check PIN lockout
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      res.status(429).json({ error: "Too many attempts", lockedUntil: user.pinLockedUntil });
      return;
    }
    if (!user.pinHash) {
      // No PIN set yet — allow login with "0000" default
      if (pin !== "0000") {
        res.status(401).json({ error: "Invalid PIN" });
        return;
      }
    } else {
      const match = await bcrypt.compare(pin, user.pinHash);
      if (!match) {
        const attempts = user.pinAttempts + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : undefined;
        await db.update(usersTable).set({
          pinAttempts: attempts,
          ...(lockedUntil ? { pinLockedUntil: lockedUntil } : {}),
        }).where(eq(usersTable.id, user.id));
        if (lockedUntil) {
          res.status(429).json({ error: "Too many attempts", lockedUntil });
          return;
        }
        res.status(401).json({ error: "Invalid PIN" });
        return;
      }
    }
    // Reset attempt counter
    await db.update(usersTable).set({ pinAttempts: 0, pinLockedUntil: null })
      .where(eq(usersTable.id, user.id));
    const token = signToken({ userId: user.id, userType: user.userType });
    res.json({ user: await toUserProfile(user.id), token });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/change-pin
router.post("/change-pin", requireAuth, async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (user.pinHash) {
      const match = await bcrypt.compare(oldPin, user.pinHash);
      if (!match) { res.status(401).json({ error: "Current PIN incorrect" }); return; }
    }
    const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);
    await db.update(usersTable).set({ pinHash, updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId!));
    res.json({ message: "PIN changed" });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// Build user profile including hasCharacter flag
async function toUserProfile(userId: number) {
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  
  const [char] = await db.select({ configured: charactersTable.configured })
    .from(charactersTable).where(eq(charactersTable.userId, userId)).limit(1);
  
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    userType: user.userType,
    isAppAdmin: user.isAppAdmin,
    lifetimeXp: user.lifetimeXp,
    currentLevel: user.currentLevel,
    personalGold: user.personalGold,
    legendaryCompletions: user.legendaryCompletions,
    adventureMode: user.adventureMode,
    soundEnabled: user.soundEnabled,
    hapticsEnabled: user.hapticsEnabled,
    activePartyId: user.activePartyId,
    hasCharacter: !!(char?.configured),
  };
}

export { toUserProfile };
export default router;
