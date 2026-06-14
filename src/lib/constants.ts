// Shared game configuration: disciplines, rubric, scoring, badges.
// Keep this framework-agnostic so it can be imported on both server and client.

export type DisciplineKey = "PRODUCT" | "STRATEGY" | "ANALYTICS";

export const DISCIPLINES: Record<
  DisciplineKey,
  { label: string; blurb: string; accent: string }
> = {
  PRODUCT: {
    label: "Product",
    blurb: "Is it usable, buildable, genuinely wanted?",
    accent: "#6366f1", // indigo
  },
  STRATEGY: {
    label: "Strategy",
    blurb: "Where's the moat and the business model?",
    accent: "#ec4899", // pink
  },
  ANALYTICS: {
    label: "Analytics",
    blurb: "What data does it create, and how do you measure win?",
    accent: "#14b8a6", // teal
  },
};

// The six rubric dimensions. Customer-servicing impact is weighted highest,
// AI-native thinking second — everything else is equal weight so each
// discipline has a place to shine.
export type RubricKey =
  | "csImpact"
  | "aiNative"
  | "desirability"
  | "strategicEdge"
  | "dataMeasurability"
  | "creativity";

export interface RubricDimension {
  key: RubricKey;
  label: string;
  weight: number;
  lens: string;
  hint: string;
}

export const RUBRIC: RubricDimension[] = [
  {
    key: "csImpact",
    label: "Customer Servicing Impact",
    weight: 2,
    lens: "Primary",
    hint: "Does it solve a real service pain or delight the customer?",
  },
  {
    key: "aiNative",
    label: "AI-Native Thinking",
    weight: 1.5,
    lens: "Everyone",
    hint: "Is AI the core of the experience, not bolted on?",
  },
  {
    key: "desirability",
    label: "Desirability & Feasibility",
    weight: 1,
    lens: "Product",
    hint: "Usable, buildable, genuinely wanted.",
  },
  {
    key: "strategicEdge",
    label: "Strategic Edge",
    weight: 1,
    lens: "Strategy",
    hint: "Moat, monetization, defensibility.",
  },
  {
    key: "dataMeasurability",
    label: "Data & Measurability",
    weight: 1,
    lens: "Analytics",
    hint: "Data it generates and how success is measured.",
  },
  {
    key: "creativity",
    label: "Wow Factor",
    weight: 1,
    lens: "Everyone",
    hint: "Originality and delight.",
  },
];

// Max raw per dimension is 10. Max weighted total = 10 * (2+1.5+1+1+1+1) = 75.
export const MAX_WEIGHTED = RUBRIC.reduce((s, d) => s + d.weight * 10, 0);

export const BOSS_MULTIPLIER = 1.5;
export const ROUND_SECONDS = 240; // 4 minutes

// Badge catalogue. Unlock logic lives in src/lib/badges.ts.
export interface BadgeDef {
  type: string;
  label: string;
  emoji: string;
  description: string;
}

export const BADGES: Record<string, BadgeDef> = {
  FIRST_PITCH: {
    type: "FIRST_PITCH",
    label: "First Pitch",
    emoji: "🚀",
    description: "Submitted your first AI-native redesign.",
  },
  CUSTOMER_CHAMPION: {
    type: "CUSTOMER_CHAMPION",
    label: "Customer Champion",
    emoji: "💚",
    description: "Scored 9+ on Customer Servicing Impact.",
  },
  AI_WHISPERER: {
    type: "AI_WHISPERER",
    label: "AI Whisperer",
    emoji: "🧠",
    description: "Scored 9+ on AI-Native Thinking.",
  },
  MOAT_BUILDER: {
    type: "MOAT_BUILDER",
    label: "Moat Builder",
    emoji: "🏰",
    description: "Scored 9+ on Strategic Edge.",
  },
  DATA_DIVINER: {
    type: "DATA_DIVINER",
    label: "Data Diviner",
    emoji: "📊",
    description: "Scored 9+ on Data & Measurability.",
  },
  HOT_STREAK: {
    type: "HOT_STREAK",
    label: "Hot Streak",
    emoji: "🔥",
    description: "Three strong rounds (60+ weighted) in a row.",
  },
  BOSS_SLAYER: {
    type: "BOSS_SLAYER",
    label: "Boss Slayer",
    emoji: "⚔️",
    description: "Aced a boss round (60+ weighted).",
  },
  PERFECTIONIST: {
    type: "PERFECTIONIST",
    label: "Perfectionist",
    emoji: "💎",
    description: "Landed a perfect 10 on any dimension.",
  },
};

export const STRONG_ROUND = 60; // weighted threshold for "strong"
