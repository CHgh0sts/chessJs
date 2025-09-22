const { prisma } = require('./prisma');

// Créer une nouvelle partie
async function createGame(whiteId, blackId, timeControl = 600) {
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
    timeLeft: game.timeLeft,
    startedAt: game.startedAt,
    endedAt: game.endedAt || undefined,
  };
}

// Récupérer une partie par ID
async function getGameById(gameId) {
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
    timeLeft: game.timeLeft,
    startedAt: game.startedAt,
    endedAt: game.endedAt || undefined,
  };
}

// Mettre à jour une partie (coup, temps, etc.)
async function updateGame(gameId, updates) {
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
    timeLeft: updatedGame.timeLeft,
    startedAt: updatedGame.startedAt,
    endedAt: updatedGame.endedAt || undefined,
  };
}

// Terminer une partie
async function endGame(gameId, result, winner) {
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
async function updatePlayerStats(userId, result) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return;

  const updates = {
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
async function getUserGames(userId, limit = 10) {
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
    timeLeft: game.timeLeft,
    startedAt: game.startedAt,
    endedAt: game.endedAt || undefined,
  }));
}

// Récupérer les parties en cours d'un utilisateur
async function getUserActiveGames(userId) {
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
    timeLeft: game.timeLeft,
    startedAt: game.startedAt,
    endedAt: game.endedAt || undefined,
  }));
}

module.exports = {
  createGame,
  getGameById,
  updateGame,
  endGame,
  getUserGames,
  getUserActiveGames
};
