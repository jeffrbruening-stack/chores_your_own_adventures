import { db } from "@workspace/db";
import { partyMembersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export async function getMemberRole(partyId: number, userId: number): Promise<string | null> {
  const [member] = await db.select({ role: partyMembersTable.role })
    .from(partyMembersTable)
    .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, userId)))
    .limit(1);
  return member?.role ?? null;
}

export async function assertLeader(partyId: number, userId: number) {
  const role = await getMemberRole(partyId, userId);
  if (role !== "leader") throw Object.assign(new Error("Not a party leader"), { status: 403 });
}

export async function assertMember(partyId: number, userId: number) {
  const role = await getMemberRole(partyId, userId);
  if (!role) throw Object.assign(new Error("Not a member of this party"), { status: 403 });
}
