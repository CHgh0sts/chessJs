import { prisma } from './prisma';
import { Game, GameStatus, GameResult } from '@prisma/client';

export interface GameData {
  id: string;
  whiteId: string;
  blackId: string;
  fen: string;
  moves: string[];
  status: GameStatus;
  result?: GameResult;
  timeControl: number;
  timeLeft: {
    white: number;
    black: number;
  };
  startedAt: Date;
  endedAt?: Date;
}

// Créer une nouvelle partie
export async function createGame(
  whiteId: string,
  blackId: string,
  timeControl: number = 600 // 10 minutes par défaut
): Promise<GameData> {
  const game = await prisma.game.create({
    data: {
      whiteId,
      blackId,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Position initiale
      moves: [],
      status: 'ONGOING',
      timeControl,
      timeLeft: {
        white: timeControl,
        black: timeControl,
      },
      startedAt: new Date(),
    },
  });

  return {
    id: game.id,
    whiteId: game.whiteId,
    blackId: game.blackId,
    fen: game.fen,
    moves: game.moves,
    status: game.status,
    result: game.result || undefined,
    timeControl: game.timeControl,
    timeLeft: game.timeLeft as { white: number; black: number },
    startedAt: game.startedAt,
    endedAt: game.endedAt || undefined,
  };
}

// Récupérer une partie par ID
export async function getGameById(gameId: string): Promise<GameData | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
  });

  if (!game) return null;

  return {
    id: game.id,
    whiteId: game.whiteId,
    blackId: game.blackId,
    fen: game.fen,
    moves: game.moves,
    status: game.status,
    result: game.result || undefined,
    timeControl: game.timeControl,
    timeLeft: game.timeLeft as { white: number; black: number },
    startedAt: game.startedAt,
    endedAt: game.endedAt || undefined,
  };
}

// Mettre à jour une partie (coup, temps, etc.)
export async function updateGame(
  gameId: string,
  updates: {
    fen?: string;
    moves?: string[];
    timeLeft?: { white: number; black: number };
    status?: GameStatus;
    result?: GameResult;
    endedAt?: Date;
  }
): Promise<GameData | null> {
  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });

  return {
    id: updatedGame.id,
    whiteId: updatedGame.whiteId,
    blackId: updatedGame.blackId,
    fen: updatedGame.fen,
    moves: updatedGame.moves,
    status: updatedGame.status,
    result: updatedGame.result || undefined,
    timeControl: updatedGame.timeControl,
    timeLeft: updatedGame.timeLeft as { white: number; black: number },
    startedAt: updatedGame.startedAt,
    endedAt: updatedGame.endedAt || undefined,
  };
}

// Terminer une partie
export async function endGame(
  gameId: string,
  result: GameResult,
  winner?: 'white' | 'black'
): Promise<GameData | null> {
  const updatedGame = await updateGame(gameId, {
    status: 'FINISHED',
    result,
    endedAt: new Date(),
  });

  if (updatedGame && winner) {
    // Mettre à jour les statistiques des joueurs
    const winnerId = winner === 'white' ? updatedGame.whiteId : updatedGame.blackId;
    const loserId = winner === 'white' ? updatedGame.blackId : updatedGame.whiteId;

    if (result === 'WHITE_WINS' || result === 'BLACK_WINS') {
      // Victoire/défaite
      await Promise.all([
        updatePlayerStats(winnerId, 'win'),
        updatePlayerStats(loserId, 'loss'),
      ]);
    } else if (result === 'DRAW') {
      // Match nul
      await Promise.all([
        updatePlayerStats(updatedGame.whiteId, 'draw'),
        updatePlayerStats(updatedGame.blackId, 'draw'),
      ]);
    }
  }

  return updatedGame;
}

// Mettre à jour les statistiques d'un joueur
async function updatePlayerStats(
  userId: string,
  result: 'win' | 'loss' | 'draw'
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return;

  const updates: any = {
    gamesPlayed: user.gamesPlayed + 1,
  };

  switch (result) {
    case 'win':
      updates.gamesWon = user.gamesWon + 1;
      break;
    case 'loss':
      updates.gamesLost = user.gamesLost + 1;
      break;
    case 'draw':
      updates.gamesDraw = user.gamesDraw + 1;
      break;
  }

  await prisma.user.update({
    where: { id: userId },
    data: updates,
  });
}

// Récupérer les parties d'un utilisateur
export async function getUserGames(
  userId: string,
  limit: number = 10
): Promise<GameData[]> {
  const games = await prisma.game.findMany({
    where: {
      OR: [
        { whiteId: userId },
        { blackId: userId },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return games.map(game => ({
    id: game.id,
    whiteId: game.whiteId,
    blackId: game.blackId,
    fen: game.fen,
    moves: game.moves,
    status: game.status,
    result: game.result || undefined,
    timeControl: game.timeControl,
    timeLeft: game.timeLeft as { white: number; black: number },
    startedAt: game.startedAt,
    endedAt: game.endedAt || undefined,
  }));
}

// Récupérer les parties en cours d'un utilisateur
export async function getUserActiveGames(userId: string): Promise<GameData[]> {
  const games = await prisma.game.findMany({
    where: {
      AND: [
        {
          OR: [
            { whiteId: userId },
            { blackId: userId },
          ],
        },
        { status: 'ONGOING' },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return games.map(game => ({
    id: game.id,
    whiteId: game.whiteId,
    blackId: game.blackId,
    fen: game.fen,
    moves: game.moves,
    status: game.status,
    result: game.result || undefined,
    timeControl: game.timeControl,
    timeLeft: game.timeLeft as { white: number; black: number },
    startedAt: game.startedAt,
    endedAt: game.endedAt || undefined,
  }));
}
