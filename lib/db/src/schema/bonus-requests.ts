import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const bonusGoldRequestsTable = pgTable("bonus_gold_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  partyId: integer("party_id").notNull(),
  assignmentId: integer("assignment_id"),      // optional — ties to a specific quest
  note: text("note"),                          // kid's description of the extra effort
  status: text("status").notNull().default("pending"), // pending | approved | declined
  bonusGold: integer("bonus_gold"),            // filled in by adult on approval
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  declineReason: text("decline_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
