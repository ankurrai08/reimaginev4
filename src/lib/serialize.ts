import type { DisciplineKey } from "./constants";

export interface PlayerState {
  id: string;
  name: string;
  discipline: DisciplineKey;
  roomCode: string;
  totalScore: number;
  streak: number;
  roundsPlayed: number;
  badges: string[];
}

type PlayerWithRels = {
  id: string;
  name: string;
  discipline: string;
  totalScore: number;
  streak: number;
  roundsPlayed: number;
  room?: { code: string } | null;
  badges?: { type: string }[];
};

export function serializePlayer(p: PlayerWithRels, roomCode?: string): PlayerState {
  return {
    id: p.id,
    name: p.name,
    discipline: p.discipline as DisciplineKey,
    roomCode: roomCode ?? p.room?.code ?? "",
    totalScore: p.totalScore,
    streak: p.streak,
    roundsPlayed: p.roundsPlayed,
    badges: p.badges?.map((b) => b.type) ?? [],
  };
}
