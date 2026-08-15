/**
 * Integration tests for GET /api/party-recap
 *
 * Covers:
 *  - Kid denied (403)
 *  - Non-member denied (403)
 *  - Unauthenticated denied (401)
 *  - Adult allowed (200)
 *  - Leader allowed (200)
 *  - Target userId not in party → 404
 *  - Completion rate never exceeds 100%
 *  - Day bucketing respects the tzOffset query param
 *
 * The DB and party-membership helper are mocked so no real database is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports from the mocked modules.
// vi.mock() calls are hoisted by Vitest to the top of the file.
// ---------------------------------------------------------------------------

vi.mock("@workspace/db", () => ({
  db: {
    // select() is re-configured per test via mockReturnValueOnce
    select: vi.fn(),
  },
}));

vi.mock("@workspace/db/schema", () => ({
  questAssignmentsTable: {
    id: {},
    partyId: {},
    userId: {},
    status: {},
    completedAt: {},
    xpAwarded: {},
    goldAwarded: {},
    questDefinitionId: {},
    createdAt: {},
  },
  questDefinitionsTable: { id: {}, plainTitle: {}, adventureTitle: {}, questType: {} },
  usersTable: {
    id: {},
    displayName: {},
    lifetimeXp: {},
    currentLevel: {},
    isAppAdmin: {},
  },
}));

// Drizzle operators are used only to build SQL; since the whole db.select
// chain is mocked they never touch real SQL — stub them out as no-ops.
vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: (...args: unknown[]) => ({}),
  gte: () => ({}),
  lte: () => ({}),
  inArray: () => ({}),
}));

// The only function from party.ts the recap route calls
vi.mock("../lib/party.js", () => ({
  getMemberRole: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Actual imports — resolved AFTER mocks are applied
// ---------------------------------------------------------------------------
import { db } from "@workspace/db";
import { getMemberRole } from "../lib/party.js";
import { signToken } from "../lib/auth.js";
import partyRecapRouter from "./party-recap.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a thenable object that mimics Drizzle's fluent query builder.
 * Each builder method returns `this`, and the object resolves to `result`
 * when awaited.
 */
function makeChain<T>(result: T[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    then: (onFulfilled: (v: T[]) => unknown, onRejected: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected: (e: unknown) => unknown) =>
      Promise.resolve(result).catch(onRejected),
    finally: (fn: () => void) => Promise.resolve(result).finally(fn),
  };
  return chain;
}

/** Minimal completed-quest record */
function makeCompleted(overrides: Record<string, unknown> = {}) {
  return {
    assignmentId: 1,
    title: "Clean Room",
    adventureTitle: "Cleanse the Lair",
    questType: "individual",
    completedAt: new Date("2026-08-15T10:00:00Z"),
    xpAwarded: 25,
    goldAwarded: 10,
    userId: 42,
    userName: "Alice",
    ...overrides,
  };
}

/** Minimal assigned-quest record */
function makeAssigned(status = "completed") {
  return { id: 1, status };
}

/** Minimal user record */
function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    lifetimeXp: 100,
    currentLevel: 2,
    displayName: "Alice",
    ...overrides,
  };
}

// Pre-build tokens for two different user IDs
const adultToken  = signToken({ userId: 1, userType: "adult" });
const leaderToken = signToken({ userId: 2, userType: "adult" });
const kidToken    = signToken({ userId: 3, userType: "kid" });

// Required query params for a valid request
const BASE_PARAMS = {
  partyId: "10",
  from: "2026-08-01T00:00:00Z",
  to: "2026-08-31T23:59:59Z",
};

/** Build a supertest agent wired up to just the recap router */
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/party-recap", partyRecapRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/party-recap — authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(buildApp())
      .get("/api/party-recap")
      .query(BASE_PARAMS);

    expect(res.status).toBe(401);
  });

  it("returns 401 when the JWT is invalid", async () => {
    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", "Bearer this-is-not-a-real-token")
      .query(BASE_PARAMS);

    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is a kid", async () => {
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("kid");

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${kidToken}`)
      .query(BASE_PARAMS);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/grown-up/i);
  });

  it("returns 403 when the caller is not a member of the party", async () => {
    // getMemberRole returns null → caller has no role in the party
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query(BASE_PARAMS);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/grown-up/i);
  });
});

describe("GET /api/party-recap — access granted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: two empty DB responses (completed + assigned).
    // Tests that expect data can override via mockReturnValueOnce BEFORE these.
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValue(makeChain([]));
  });

  it("returns 200 for an adult member", async () => {
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("adult");
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain([]))  // completed
      .mockReturnValueOnce(makeChain([])); // assigned

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query(BASE_PARAMS);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ questsCompleted: [], completionRate: 0 });
  });

  it("returns 200 for a leader", async () => {
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("leader");
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain([]))  // completed
      .mockReturnValueOnce(makeChain([])); // assigned

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${leaderToken}`)
      .query(BASE_PARAMS);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ questsCompleted: [], completionRate: 0 });
  });
});

describe("GET /api/party-recap — cross-party userId check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the requested userId is not in this party", async () => {
    // First getMemberRole: caller is an adult in party 10
    // Second getMemberRole: target user 99 has no role in party 10
    const mockRole = getMemberRole as ReturnType<typeof vi.fn>;
    mockRole
      .mockResolvedValueOnce("adult") // caller
      .mockResolvedValueOnce(null);   // target user 99 → not in party

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query({ ...BASE_PARAMS, userId: "99" });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/adventurer/i);
  });

  it("does not leak data for a userId that belongs to a different party", async () => {
    // Simulates: adult in party 10 requests userId 55 who is in party 20.
    // getMemberRole(10, 55) returns null because userId 55 is not in party 10.
    const mockRole = getMemberRole as ReturnType<typeof vi.fn>;
    mockRole
      .mockResolvedValueOnce("adult") // caller is in party 10
      .mockResolvedValueOnce(null);   // userId 55 is NOT in party 10

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query({ ...BASE_PARAMS, userId: "55" });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/party-recap — completion rate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completion rate is 100% when every assigned quest is completed", async () => {
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("adult");
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain([makeCompleted()])) // completed quests
      .mockReturnValueOnce(                              // assigned: all completed
        makeChain([makeAssigned("completed"), makeAssigned("completed"), makeAssigned("completed")]),
      )
      .mockReturnValueOnce(makeChain([makeUser()]));     // user lookup

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query(BASE_PARAMS);

    expect(res.status).toBe(200);
    expect(res.body.completionRate).toBe(100);
  });

  it("completion rate is never greater than 100", async () => {
    // Build a scenario with maximum possible completions
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("leader");
    const manyCompleted = Array.from({ length: 5 }, (_, i) =>
      makeCompleted({ assignmentId: i + 1, userId: 42 }),
    );
    const allAssigned = Array.from({ length: 5 }, () => makeAssigned("completed"));

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain(manyCompleted)) // completed quests
      .mockReturnValueOnce(makeChain(allAssigned))    // assigned quests
      .mockReturnValueOnce(makeChain([makeUser()]));  // user lookup

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${leaderToken}`)
      .query(BASE_PARAMS);

    expect(res.status).toBe(200);
    expect(res.body.completionRate).toBeLessThanOrEqual(100);
    expect(res.body.completionRate).toBe(100);
  });

  it("completion rate is 0 when no quests were assigned in the window", async () => {
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("adult");
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain([])) // completed: none
      .mockReturnValueOnce(makeChain([])); // assigned: none

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query(BASE_PARAMS);

    expect(res.status).toBe(200);
    expect(res.body.completionRate).toBe(0);
  });

  it("partial completion produces a rate strictly between 0 and 100", async () => {
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("adult");
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain([makeCompleted()])) // 1 completed
      .mockReturnValueOnce(                              // 4 assigned, 1 completed
        makeChain([
          makeAssigned("completed"),
          makeAssigned("active"),
          makeAssigned("failed"),
          makeAssigned("active"),
        ]),
      )
      .mockReturnValueOnce(makeChain([makeUser()]));

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query(BASE_PARAMS);

    expect(res.status).toBe(200);
    expect(res.body.completionRate).toBeGreaterThan(0);
    expect(res.body.completionRate).toBeLessThan(100);
    // 1 completed / 4 assigned = 25 %
    expect(res.body.completionRate).toBe(25);
  });
});

describe("GET /api/party-recap — day bucketing with tzOffset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * completedAt = 2026-08-15T01:00:00Z (1 AM UTC)
   *
   * tzOffset = 0   (UTC)    → local date is "2026-08-15"
   * tzOffset = 120 (UTC-2)  → local time = 23:00 prev day → "2026-08-14"
   * tzOffset = -60 (UTC+1)  → local time = 02:00 same day → "2026-08-15"
   */
  const COMPLETION_TIME = new Date("2026-08-15T01:00:00Z");

  function setupMocksWithCompletion(completedAt: Date) {
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("adult");
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain([makeCompleted({ completedAt, userId: 42 })]))
      .mockReturnValueOnce(makeChain([makeAssigned("completed")]))
      .mockReturnValueOnce(makeChain([makeUser()]));
  }

  it("with tzOffset=0 (UTC) buckets the completion on 2026-08-15", async () => {
    setupMocksWithCompletion(COMPLETION_TIME);

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query({ ...BASE_PARAMS, tzOffset: "0" });

    expect(res.status).toBe(200);
    expect(res.body.byDay).toHaveLength(1);
    expect(res.body.byDay[0].date).toBe("2026-08-15");
  });

  it("with tzOffset=120 (UTC-2) buckets the 01:00 UTC completion on 2026-08-14", async () => {
    // 01:00 UTC = 23:00 on Aug 14 in UTC-2
    setupMocksWithCompletion(COMPLETION_TIME);

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query({ ...BASE_PARAMS, tzOffset: "120" });

    expect(res.status).toBe(200);
    expect(res.body.byDay).toHaveLength(1);
    expect(res.body.byDay[0].date).toBe("2026-08-14");
  });

  it("with tzOffset=-60 (UTC+1) buckets the 01:00 UTC completion on 2026-08-15", async () => {
    // 01:00 UTC = 02:00 on Aug 15 in UTC+1 — same day
    setupMocksWithCompletion(COMPLETION_TIME);

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query({ ...BASE_PARAMS, tzOffset: "-60" });

    expect(res.status).toBe(200);
    expect(res.body.byDay).toHaveLength(1);
    expect(res.body.byDay[0].date).toBe("2026-08-15");
  });

  it("completions at different UTC times can fall on different local days", async () => {
    // Two completions 4 hours apart: 2026-08-15T00:30Z and 2026-08-15T04:30Z
    // With tzOffset=120 (UTC-2):
    //   00:30 UTC → 22:30 Aug 14 local → "2026-08-14"
    //   04:30 UTC → 02:30 Aug 15 local → "2026-08-15"
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce("adult");
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain([
        makeCompleted({ assignmentId: 1, completedAt: new Date("2026-08-15T00:30:00Z"), userId: 42 }),
        makeCompleted({ assignmentId: 2, completedAt: new Date("2026-08-15T04:30:00Z"), userId: 42 }),
      ]))
      .mockReturnValueOnce(makeChain([makeAssigned("completed"), makeAssigned("completed")]))
      .mockReturnValueOnce(makeChain([makeUser()]));

    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query({ ...BASE_PARAMS, tzOffset: "120" });

    expect(res.status).toBe(200);
    expect(res.body.byDay).toHaveLength(2);
    const dates = res.body.byDay.map((d: { date: string }) => d.date);
    expect(dates).toContain("2026-08-14");
    expect(res.body.byDay.find((d: { date: string; count: number }) => d.date === "2026-08-14")?.count).toBe(1);
    expect(res.body.byDay.find((d: { date: string; count: number }) => d.date === "2026-08-15")?.count).toBe(1);
  });
});

describe("GET /api/party-recap — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when partyId is missing", async () => {
    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query({ from: BASE_PARAMS.from, to: BASE_PARAMS.to });

    expect(res.status).toBe(400);
  });

  it("returns 400 when from date is invalid", async () => {
    const res = await request(buildApp())
      .get("/api/party-recap")
      .set("Authorization", `Bearer ${adultToken}`)
      .query({ partyId: "10", from: "not-a-date", to: BASE_PARAMS.to });

    expect(res.status).toBe(400);
  });
});
