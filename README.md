# ReimaginAI 🪄

A competitive, AI-judged game for building **AI fluency** on a Customer Servicing
Innovation team. Players are dealt an everyday object and a customer-servicing
twist, then pitch an **AI-native redesign**. Claude scores each pitch against a
weighted rubric, coaches the player, and the room's **live leaderboard** updates.

- **Customer Servicing Impact** is the highest-weighted dimension, so every
  pitch is pushed toward real service value.
- Each discipline (Product / Strategy / Analytics) has a dimension to shine in.
- Passwordless: each player gets a **token** saved in their browser. An **admin
  portal** can reissue tokens and fix scores.

Built with Next.js (App Router), Prisma + Postgres (Neon), and the Anthropic SDK
(Claude Opus 4.8).

---

## How it plays

1. Join with a name, discipline, and a **room code** (e.g. `OFFSITE-Q3`).
   Everyone in the same room shares a leaderboard.
2. Get dealt an object + a customer-servicing lens (sometimes a **boss round**).
3. Answer four prompts: what it is · how AI is central · how it serves the
   customer · what data/feedback loop it creates.
4. The **AI judge** scores six dimensions (0–10), gives a verdict and coaching,
   and awards points + badges. Customer-servicing impact is weighted ×2,
   AI-native thinking ×1.5.
5. Climb the leaderboard — Overall, by discipline, and a **Team battle**.

---

## Local development

```bash
npm install
cp .env.example .env          # then fill in the three values
npm run db:push               # creates the tables in your DATABASE_URL
npm run dev                   # http://localhost:3000
```

You need:

- **`DATABASE_URL`** — a Postgres database. Easiest is a free
  [Neon](https://neon.tech) project (use the *pooled* connection string).
- **`ANTHROPIC_API_KEY`** — from the [Anthropic Console](https://console.anthropic.com).
- **`ADMIN_PASSWORD`** — any password; gates `/admin`.

---

## Deploy to Vercel + Neon (≈10 minutes)

1. **Create the database.** In Vercel → your project → **Storage**, add a
   **Neon Postgres** database (or create one at neon.tech and copy its pooled
   connection string). This sets `DATABASE_URL` for you when using the Vercel
   integration.
2. **Push this repo** to GitHub and **Import** it into Vercel.
3. **Set environment variables** (Project → Settings → Environment Variables):
   - `DATABASE_URL` (if not added by the Neon integration)
   - `ANTHROPIC_API_KEY`
   - `ADMIN_PASSWORD`
4. **Create the tables.** Once `DATABASE_URL` is set, push the schema. From your
   machine with the production `DATABASE_URL` in `.env`:
   ```bash
   npm run db:push
   ```
5. **Deploy.** Vercel runs `prisma generate && next build` automatically (the
   Prisma client is generated at build time).

Share the deployed URL with your team. Everyone opens it, picks the same room
code, and plays.

> The build step runs `prisma generate`; the generated client lives in
> `src/generated/prisma` and is git-ignored, so it's regenerated on every build.

---

## Admin portal

Visit `/admin` and sign in with `ADMIN_PASSWORD`. You can:

- **Search** players by name or room code.
- **Reset / reissue a token** — use this when a player clears their browser or
  forgets their token. Read the new token back to them; they choose
  *"I already have a token"* on the home screen to rejoin with their score
  intact. (The old token stops working immediately.)
- **Fix a score** or **delete** a player.

---

## The rubric (how the AI judge scores)

| Dimension | Weight | Lens |
|---|---|---|
| Customer Servicing Impact | ×2 | Primary — solves a real service pain / delights |
| AI-Native Thinking | ×1.5 | AI is the core, not bolted-on automation |
| Desirability & Feasibility | ×1 | Product |
| Strategic Edge | ×1 | Strategy — moat / business model |
| Data & Measurability | ×1 | Analytics — data + metrics |
| Wow Factor | ×1 | Everyone |

Max weighted score per round is 75; boss rounds multiply points ×1.5 and a
hot streak adds up to +50%.

Tune the cards in `src/data/objects.json` and `src/data/lenses.json`, the rubric
and badges in `src/lib/constants.ts`, and the judge's instructions in
`src/lib/judge.ts`.
