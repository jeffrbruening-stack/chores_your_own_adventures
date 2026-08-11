---
name: CYOA Authentication Architecture
description: Custom JWT auth used instead of Clerk; how adults/kids authenticate and why
---

# CYOA Auth Architecture

This app uses **custom bcrypt + JWT auth** — NOT Clerk, NOT Replit Auth.

## Why custom auth
Clerk doesn't support the kid flow: household code → character select → 4-digit PIN. The kid auth has no email/password.

## Token flow
- Adults: email + password → POST /api/auth/login → JWT token (30d) in localStorage "cyoa_token"
- Kids: household code → user select → 4-digit PIN → POST /api/auth/kid-login → JWT token (30d)
- Token sent as Authorization: Bearer <token> via setAuthTokenGetter in custom-fetch.ts

## Key files
- `artifacts/api-server/src/lib/auth.ts` — signToken/verifyToken/requireAuth/requireAdmin middleware
- `artifacts/api-server/src/routes/auth.ts` — all auth endpoints
- `artifacts/cyoa/src/contexts/auth-context.tsx` — React context with login/logout/activePartyId
- `lib/api-client-react/src/custom-fetch.ts` — setAuthTokenGetter/setBaseUrl used by auth context

## PIN lockout
5 failed attempts = 15-minute lockout. Tracked in users.pin_attempts + users.pin_locked_until.

**Why:** Kids shouldn't share PINs; lockout prevents brute force. Adults reset via leader panel.
