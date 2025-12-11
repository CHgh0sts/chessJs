const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

// Import des fonctions de persistance
const { createGame, getGameById, updateGame, getUserActiveGames } = require('./lib-server.js');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Stockage en mémoire pour les parties et utilisateurs connectés
const games = new Map();
const waitingPlayers = [];
const connectedUsers = new Map();

async function createNewGame(player1, player2) {
  try {
    // Créer la partie en base de données
    console.log('🔧 Création partie DB - IDs:', { 
      player1: player1.user.id, 
      player2: player2.user.id,
      player1User: player1.user,
      player2User: player2.user
    });
    
    const dbGame = await createGame(player1.user.id, player2.user.id, 10 * 60 * 1000); // 10 minutes
    
    const chess = new Chess();
    
    const game = {
      id: dbGame.id,
      chess,
      players: {
        white: player1,
        black: player2
      },
      timeLeft: dbGame.timeLeft,
      currentPlayer: dbGame.currentPlayer,
      status: 'active',
      lastMoveTime: Date.now(),
      spectators: [],
      isFriendlyGame: false,
      dbGame // Référence vers la partie en base
    };

    games.set(dbGame.id, game);
    console.log('🎮 Nouvelle partie créée en DB:', dbGame.id);
    return game;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la partie en base:', error);
    
    // Fallback vers la création en mémoire seulement
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
        white: 10 * 60 * 1000,
        black: 10 * 60 * 1000
      },
      currentPlayer: 'white',
      status: 'active',
      lastMoveTime: Date.now(),
      spectators: [],
      isFriendlyGame: false
    };
    
    games.set(gameId, game);
    console.log('🎮 Nouvelle partie créée en mémoire (fallback):', gameId);
    return game;
  }
}

function startGameTimer(game, io) {
  const timer = setInterval(() => {
    if (game.status !== 'active' || game.isFriendlyGame) {
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

    socket.on('rejoinGame', async (data) => {
      const { gameId } = data;
      const user = socket.user;
      
      if (!user) {
        socket.emit('error', 'Utilisateur non authentifié');
        return;
      }

      console.log(`🔄 ${user.username} tente de rejoindre la partie: ${gameId}`);
      
      // D'abord vérifier en mémoire
      let game = games.get(gameId);
      
      // Si pas en mémoire, essayer de charger depuis la DB
      if (!game) {
        console.log(`🔄 Partie ${gameId} non trouvée en mémoire, chargement depuis DB...`);
        try {
          const dbGame = await getGameById(gameId);
          if (!dbGame || dbGame.status !== 'ACTIVE') {
            console.log(`❌ Partie ${gameId} non trouvée en DB ou terminée`);
            socket.emit('gameNotFound', { gameId });
            return;
          }
          
          // Reconstituer la partie en mémoire depuis la DB
          const chess = new Chess(dbGame.fen);
          
          // Récupérer les infos des joueurs (pour l'instant, on utilise des infos minimales)
          game = {
            id: dbGame.id,
            chess,
            players: {
              white: { 
                user: { id: dbGame.whiteId, username: `Player_${dbGame.whiteId.slice(0,8)}` }, 
                socketId: null, 
                socket: null 
              },
              black: { 
                user: { id: dbGame.blackId, username: `Player_${dbGame.blackId.slice(0,8)}` }, 
                socketId: null, 
                socket: null 
              }
            },
            timeLeft: dbGame.timeLeft,
            currentPlayer: dbGame.currentPlayer,
            status: 'active',
            lastMoveTime: dbGame.lastMoveTime ? dbGame.lastMoveTime.getTime() : Date.now(),
            spectators: [],
            isFriendlyGame: false, // Par défaut, les parties restaurées ne sont pas amicales
            dbGame
          };
          
          games.set(gameId, game);
          console.log(`✅ Partie ${gameId} restaurée depuis DB`);
        } catch (error) {
          console.error(`❌ Erreur lors du chargement de la partie ${gameId}:`, error);
          socket.emit('gameNotFound', { gameId });
          return;
        }
      }
      
      if (game.status !== 'active') {
        console.log(`❌ Partie ${gameId} terminée (status: ${game.status})`);
        socket.emit('gameNotFound', { gameId });
        return;
      }

      // Vérifier que l'utilisateur fait partie de cette partie
      const isWhitePlayer = game.players.white.user.id === user.id;
      const isBlackPlayer = game.players.black.user.id === user.id;
      
      if (!isWhitePlayer && !isBlackPlayer) {
        console.log(`❌ ${user.username} n'est pas un joueur de la partie ${gameId}`);
        socket.emit('gameNotFound', { gameId });
        return;
      }

      // Rejoindre la room de la partie
      socket.join(gameId);

      // Mettre à jour les informations du joueur
      if (isWhitePlayer) {
        game.players.white.socketId = socket.id;
        game.players.white.socket = socket;
      } else {
        game.players.black.socketId = socket.id;
        game.players.black.socket = socket;
      }

      // Envoyer les données de la partie
      const playerColor = isWhitePlayer ? 'white' : 'black';
      const opponent = isWhitePlayer ? game.players.black.user : game.players.white.user;

      socket.emit('gameRejoined', {
        gameId: game.id,
        color: playerColor,
        opponent: opponent,
        fen: game.chess.fen(),
        currentPlayer: game.currentPlayer,
        timeLeft: game.timeLeft,
        status: game.status,
        moves: game.chess.history(),
        isFriendlyGame: game.isFriendlyGame
      });

      console.log(`✅ ${user.username} a rejoint la partie ${gameId} en tant que ${playerColor}`);
    });

    socket.on('findGame', async () => {
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
        const game = await createNewGame(
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
          timeLeft: game.timeLeft,
          moves: game.chess.history(),
          isFriendlyGame: game.isFriendlyGame
        });

        opponent.socket.emit('gameFound', {
          gameId: game.id,
          color: 'black',
          opponent: user,
          fen: game.chess.fen(),
          timeLeft: game.timeLeft,
          moves: game.chess.history(),
          isFriendlyGame: game.isFriendlyGame
        });

        // Démarrer le timer
        startGameTimer(game, io);
      } else {
        // Ajouter à la liste d'attente
        waitingPlayers.push({ socketId: socket.id, user, socket });
        socket.emit('waitingForOpponent');
      }
    });

    socket.on('makeMove', async (data) => {
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

          // Sauvegarder le coup en base de données
          if (game.dbGame) {
            try {
              await updateGame(gameId, {
                fen: game.chess.fen(),
                moves: game.chess.history(),
                timeLeft: game.timeLeft,
                currentPlayer: game.currentPlayer,
                lastMoveTime: new Date()
              });
              console.log('💾 Coup sauvegardé en base:', moveResult.san);
            } catch (dbError) {
              console.error('❌ Erreur de sauvegarde:', dbError);
            }
          }

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
            move: moveResult.san, // Utiliser la notation standard (ex: "Nf3", "exd5")
            fen: game.chess.fen(),
            currentPlayer: game.currentPlayer,
            status: gameStatus,
            winner,
            winReason,
            moves: game.chess.history()
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

    socket.on('offerFriendlyGame', (data) => {
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

      // Envoyer l'offre de partie amicale à l'adversaire
      const opponentSocketId = game.players.white.user.id === user.id 
        ? game.players.black.socketId 
        : game.players.white.socketId;
      
      io.to(opponentSocketId).emit('friendlyGameOffered', {
        from: user.username
      });

      console.log(`🤝 ${user.username} propose une partie amicale dans ${gameId}`);
    });

    socket.on('acceptFriendlyGame', (data) => {
      const { gameId } = data;
      const game = games.get(gameId);

      if (!game || game.status !== 'active') {
        socket.emit('error', 'Partie non trouvée ou terminée');
        return;
      }

      // Activer le mode partie amicale
      game.isFriendlyGame = true;
      
      // Arrêter le timer
      if (game.timer) {
        clearInterval(game.timer);
        game.timer = null;
      }

      // Informer les deux joueurs
      io.to(gameId).emit('friendlyGameAccepted');
      
      // Mettre à jour en DB si disponible
      if (game.dbGame) {
        updateGame(gameId, {
          // On peut ajouter un champ isFriendlyGame en DB plus tard si nécessaire
        }).catch(error => {
          console.error('❌ Erreur mise à jour partie amicale DB:', error);
        });
      }

      console.log(`🤝 Partie amicale activée pour ${gameId} - Timer désactivé`);
    });

    socket.on('declineFriendlyGame', (data) => {
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
      
      io.to(opponentSocketId).emit('friendlyGameDeclined');
      
      console.log(`🤝 Offre de partie amicale refusée dans ${gameId}`);
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
