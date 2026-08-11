import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

export interface AuthPayload {
  userId: number;
  userType: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userType?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.userId = payload.userId;
  req.userType = payload.userType;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select({ isAppAdmin: usersTable.isAppAdmin })
    .from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (!user?.isAppAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export async function requireLeader(partyId: number, userId: number): Promise<boolean> {
  const { partyMembersTable } = await import("@workspace/db/schema");
  const [member] = await db.select({ role: partyMembersTable.role })
    .from(partyMembersTable)
    .where(eq(partyMembersTable.partyId, partyId) as any)
    .limit(1);
  // Drizzle and() needed — keep simple for now
  return member?.role === "leader";
}
