const { PrismaClient } = require('@prisma/client');

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV === 'development') global.prisma = prisma;

// Créer une nouvelle partie
async function createGame(whiteId, blackId, timeControl = 600000) {
  try {
    const game = await prisma.game.create({
      data: {
        whiteId,
        blackId,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: "[]",
        status: 'ACTIVE',
        timeControl,
        timeLeft: JSON.stringify({
          white: timeControl,
          black: timeControl,
        }),
        currentPlayer: 'white',
        lastMoveTime: new Date(),
        startedAt: new Date(),
      },
    });

    return {
      id: game.id,
      whiteId: game.whiteId,
      blackId: game.blackId,
      fen: game.fen,
      moves: JSON.parse(game.moves || "[]"),
      status: game.status,
      result: game.result || undefined,
      timeControl: game.timeControl,
      timeLeft: JSON.parse(game.timeLeft),
      currentPlayer: game.currentPlayer,
      lastMoveTime: game.lastMoveTime,
      startedAt: game.startedAt,
      endedAt: game.endedAt || undefined,
    };
  } catch (error) {
    console.error('❌ Erreur création partie DB:', error);
    throw error;
  }
}

// Récupérer une partie par ID
async function getGameById(gameId) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) return null;

    return {
      id: game.id,
      whiteId: game.whiteId,
      blackId: game.blackId,
      fen: game.fen,
      moves: JSON.parse(game.moves || "[]"),
      status: game.status,
      result: game.result || undefined,
      timeControl: game.timeControl,
      timeLeft: JSON.parse(game.timeLeft),
      currentPlayer: game.currentPlayer,
      lastMoveTime: game.lastMoveTime,
      startedAt: game.startedAt,
      endedAt: game.endedAt || undefined,
    };
  } catch (error) {
    console.error('❌ Erreur récupération partie DB:', error);
    return null;
  }
}

// Mettre à jour une partie
async function updateGame(gameId, updates) {
  try {
    // Convertir les arrays en JSON strings si nécessaire
    const dbUpdates = { ...updates };
    if (dbUpdates.moves && Array.isArray(dbUpdates.moves)) {
      dbUpdates.moves = JSON.stringify(dbUpdates.moves);
    }
    if (dbUpdates.timeLeft && typeof dbUpdates.timeLeft === 'object') {
      dbUpdates.timeLeft = JSON.stringify(dbUpdates.timeLeft);
    }

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        ...dbUpdates,
        updatedAt: new Date(),
      },
    });

    return {
      id: updatedGame.id,
      whiteId: updatedGame.whiteId,
      blackId: updatedGame.blackId,
      fen: updatedGame.fen,
      moves: JSON.parse(updatedGame.moves || "[]"),
      status: updatedGame.status,
      result: updatedGame.result || undefined,
      timeControl: updatedGame.timeControl,
      timeLeft: JSON.parse(updatedGame.timeLeft),
      currentPlayer: updatedGame.currentPlayer,
      lastMoveTime: updatedGame.lastMoveTime,
      startedAt: updatedGame.startedAt,
      endedAt: updatedGame.endedAt || undefined,
    };
  } catch (error) {
    console.error('❌ Erreur mise à jour partie DB:', error);
    return null;
  }
}

// Récupérer les parties actives d'un utilisateur
async function getUserActiveGames(userId) {
  try {
    const games = await prisma.game.findMany({
      where: {
        AND: [
          {
            OR: [
              { whiteId: userId },
              { blackId: userId },
            ],
          },
          { status: 'ACTIVE' },
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
      moves: JSON.parse(game.moves || "[]"),
      status: game.status,
      result: game.result || undefined,
      timeControl: game.timeControl,
      timeLeft: JSON.parse(game.timeLeft),
      currentPlayer: game.currentPlayer,
      lastMoveTime: game.lastMoveTime,
      startedAt: game.startedAt,
      endedAt: game.endedAt || undefined,
    }));
  } catch (error) {
    console.error('❌ Erreur récupération parties actives:', error);
    return [];
  }
}

module.exports = {
  createGame,
  getGameById,
  updateGame,
  getUserActiveGames,
  prisma
};
