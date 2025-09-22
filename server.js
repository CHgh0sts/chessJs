const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Stockage en mémoire pour les parties et utilisateurs connectés
const games = new Map();
const waitingPlayers = [];
const connectedUsers = new Map();

function createNewGame(player1, player2) {
  const gameId = Math.random().toString(36).substring(7);
  const chess = new Chess();
  
  const game = {
    id: gameId,
    chess,
    players: {
      white: player1,
      black: player2
    },
    timeLeft: {
      white: 10 * 60 * 1000, // 10 minutes en millisecondes
      black: 10 * 60 * 1000
    },
    currentPlayer: 'white',
    status: 'active',
    lastMoveTime: Date.now(),
    spectators: []
  };
  
  games.set(gameId, game);
  return game;
}

function startGameTimer(game, io) {
  const timer = setInterval(() => {
    if (game.status !== 'active') {
      clearInterval(timer);
      return;
    }
    
    const now = Date.now();
    const timeDiff = now - game.lastMoveTime;
    
    if (game.currentPlayer === 'white') {
      game.timeLeft.white -= timeDiff;
    } else {
      game.timeLeft.black -= timeDiff;
    }
    
    game.lastMoveTime = now;
    
    // Vérifier si le temps est écoulé
    if (game.timeLeft.white <= 0) {
      game.status = 'finished';
      game.winner = 'black';
      game.winReason = 'timeout';
      io.to(game.id).emit('gameOver', { winner: 'black', reason: 'timeout' });
      clearInterval(timer);
    } else if (game.timeLeft.black <= 0) {
      game.status = 'finished';
      game.winner = 'white';
      game.winReason = 'timeout';
      io.to(game.id).emit('gameOver', { winner: 'white', reason: 'timeout' });
      clearInterval(timer);
    }
    
    // Envoyer la mise à jour du temps
    io.to(game.id).emit('timeUpdate', {
      white: Math.max(0, game.timeLeft.white),
      black: Math.max(0, game.timeLeft.black)
    });
  }, 1000);
  
  game.timer = timer;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Utilisateur connecté:', socket.id);

    socket.on('userConnected', (user) => {
      connectedUsers.set(socket.id, user);
      socket.user = user;
      console.log(`Utilisateur ${user.username} connecté`);
    });

    socket.on('findGame', () => {
      const user = socket.user;
      if (!user) {
        socket.emit('error', 'Utilisateur non authentifié');
        return;
      }

      // Vérifier si l'utilisateur est déjà en attente
      const existingIndex = waitingPlayers.findIndex(p => p.user.id === user.id);
      if (existingIndex !== -1) {
        return; // Déjà en attente
      }

      if (waitingPlayers.length > 0) {
        // Trouver un adversaire
        const opponent = waitingPlayers.shift();
        const game = createNewGame(
          { socketId: socket.id, user },
          { socketId: opponent.socketId, user: opponent.user }
        );

        // Joindre les joueurs à la room du jeu
        socket.join(game.id);
        opponent.socket.join(game.id);

        // Notifier les joueurs
        socket.emit('gameFound', {
          gameId: game.id,
          color: 'white',
          opponent: opponent.user,
          fen: game.chess.fen(),
          timeLeft: game.timeLeft
        });

        opponent.socket.emit('gameFound', {
          gameId: game.id,
          color: 'black',
          opponent: user,
          fen: game.chess.fen(),
          timeLeft: game.timeLeft
        });

        // Démarrer le timer
        startGameTimer(game, io);
      } else {
        // Ajouter à la liste d'attente
        waitingPlayers.push({ socketId: socket.id, user, socket });
        socket.emit('waitingForOpponent');
      }
    });

    socket.on('makeMove', (data) => {
      const { gameId, move } = data;
      const game = games.get(gameId);

      if (!game || game.status !== 'active') {
        socket.emit('error', 'Partie non trouvée ou terminée');
        return;
      }

      const user = socket.user;
      if (!user) {
        socket.emit('error', 'Utilisateur non authentifié');
        return;
      }

      // Vérifier que c'est le tour du joueur
      const playerColor = game.players.white.user.id === user.id ? 'white' : 'black';
      if (game.currentPlayer !== playerColor) {
        socket.emit('error', 'Ce n\'est pas votre tour');
        return;
      }

      try {
        const moveResult = game.chess.move(move);
        if (moveResult) {
          // Mettre à jour le temps
          game.lastMoveTime = Date.now();
          game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';

          // Vérifier les conditions de fin de partie
          let gameStatus = 'active';
          let winner = null;
          let winReason = null;

          if (game.chess.isCheckmate()) {
            gameStatus = 'finished';
            winner = playerColor;
            winReason = 'checkmate';
            clearInterval(game.timer);
          } else if (game.chess.isDraw()) {
            gameStatus = 'finished';
            winner = 'draw';
            winReason = 'draw';
            clearInterval(game.timer);
          }

          game.status = gameStatus;
          if (winner) {
            game.winner = winner;
            game.winReason = winReason;
          }

          // Envoyer la mise à jour à tous les joueurs de la partie
          io.to(gameId).emit('moveMade', {
            move: moveResult,
            fen: game.chess.fen(),
            currentPlayer: game.currentPlayer,
            status: gameStatus,
            winner,
            winReason
          });

          if (gameStatus === 'finished') {
            io.to(gameId).emit('gameOver', { winner, reason: winReason });
          }
        } else {
          socket.emit('error', 'Mouvement invalide');
        }
      } catch (error) {
        socket.emit('error', 'Mouvement invalide');
      }
    });

    socket.on('joinSpectate', (gameId) => {
      const game = games.get(gameId);
      if (game) {
        socket.join(gameId);
        game.spectators.push(socket.id);
        socket.emit('spectateGame', {
          gameId,
          fen: game.chess.fen(),
          currentPlayer: game.currentPlayer,
          players: {
            white: game.players.white.user,
            black: game.players.black.user
          },
          timeLeft: game.timeLeft,
          status: game.status
        });
      }
    });

    socket.on('offerDraw', (data) => {
      const { gameId } = data;
      const game = games.get(gameId);

      if (!game || game.status !== 'active') {
        socket.emit('error', 'Partie non trouvée ou terminée');
        return;
      }

      const user = socket.user;
      if (!user) {
        socket.emit('error', 'Utilisateur non authentifié');
        return;
      }

      // Vérifier que l'utilisateur est dans la partie
      const isPlayerInGame = game.players.white.user.id === user.id || game.players.black.user.id === user.id;
      if (!isPlayerInGame) {
        socket.emit('error', 'Vous n\'êtes pas dans cette partie');
        return;
      }

      // Envoyer l'offre de partie nulle à l'adversaire
      const opponentSocketId = game.players.white.user.id === user.id 
        ? game.players.black.socketId 
        : game.players.white.socketId;
      
      io.to(opponentSocketId).emit('drawOffered', {
        from: user.username
      });

      socket.emit('drawOfferSent');
    });

    socket.on('acceptDraw', (data) => {
      const { gameId } = data;
      const game = games.get(gameId);

      if (!game || game.status !== 'active') {
        socket.emit('error', 'Partie non trouvée ou terminée');
        return;
      }

      // Terminer la partie par partie nulle
      game.status = 'finished';
      game.winner = 'draw';
      game.winReason = 'agreement';
      
      clearInterval(game.timer);
      io.to(gameId).emit('gameOver', { winner: 'draw', reason: 'agreement' });
    });

    socket.on('declineDraw', (data) => {
      const { gameId } = data;
      const game = games.get(gameId);

      if (!game || game.status !== 'active') {
        return;
      }

      const user = socket.user;
      if (!user) return;

      // Informer l'adversaire que l'offre a été refusée
      const opponentSocketId = game.players.white.user.id === user.id 
        ? game.players.black.socketId 
        : game.players.white.socketId;
      
      io.to(opponentSocketId).emit('drawDeclined');
    });

    socket.on('resign', (data) => {
      const { gameId } = data;
      const game = games.get(gameId);

      if (!game || game.status !== 'active') {
        socket.emit('error', 'Partie non trouvée ou terminée');
        return;
      }

      const user = socket.user;
      if (!user) {
        socket.emit('error', 'Utilisateur non authentifié');
        return;
      }

      // Vérifier que l'utilisateur est dans la partie
      const isPlayerInGame = game.players.white.user.id === user.id || game.players.black.user.id === user.id;
      if (!isPlayerInGame) {
        socket.emit('error', 'Vous n\'êtes pas dans cette partie');
        return;
      }

      // Déterminer le gagnant (l'adversaire de celui qui abandonne)
      const winner = game.players.white.user.id === user.id ? 'black' : 'white';
      
      game.status = 'finished';
      game.winner = winner;
      game.winReason = 'resignation';
      
      clearInterval(game.timer);
      io.to(gameId).emit('gameOver', { winner, reason: 'resignation' });
    });

    socket.on('disconnect', () => {
      console.log('Utilisateur déconnecté:', socket.id);
      
      // Supprimer de la liste d'attente
      const waitingIndex = waitingPlayers.findIndex(p => p.socketId === socket.id);
      if (waitingIndex !== -1) {
        waitingPlayers.splice(waitingIndex, 1);
      }

      // Gérer la déconnexion pendant une partie
      for (const [gameId, game] of games.entries()) {
        if (game.players.white.socketId === socket.id || game.players.black.socketId === socket.id) {
          if (game.status === 'active') {
            // Marquer la partie comme abandonnée
            game.status = 'finished';
            const winner = game.players.white.socketId === socket.id ? 'black' : 'white';
            game.winner = winner;
            game.winReason = 'disconnect';
            
            clearInterval(game.timer);
            io.to(gameId).emit('gameOver', { winner, reason: 'disconnect' });
          }
          break;
        }
      }

      connectedUsers.delete(socket.id);
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Serveur prêt sur http://localhost:3000');
  });
});
