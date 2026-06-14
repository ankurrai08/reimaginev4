import objects from "@/data/objects.json";
import lenses from "@/data/lenses.json";

export interface DealtCard {
  objectName: string;
  objectEmoji: string;
  lensTitle: string;
  lensPrompt: string;
  difficulty: "NORMAL" | "BOSS";
  // Compact strings persisted on the Round and fed to the judge.
  objectCard: string;
  lensCard: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function dealCard(bossChance = 0.18): DealtCard {
  const obj = pick(objects);
  const lens = pick(lenses);
  const difficulty: "NORMAL" | "BOSS" =
    Math.random() < bossChance ? "BOSS" : "NORMAL";

  return {
    objectName: obj.name,
    objectEmoji: obj.emoji,
    lensTitle: lens.title,
    lensPrompt: lens.prompt,
    difficulty,
    objectCard: `${obj.emoji} ${obj.name}`,
    lensCard: `${lens.title}: ${lens.prompt}`,
  };
}
