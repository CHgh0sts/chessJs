const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const { randomUUID } = require('crypto');
// Base de données temporairement désactivée pour focus sur timer
// const { createGame, getGameById, updateGame, getUserActiveGames } = require('./lib-server.js');
const { getBestMove } = require('./chess-ai-server.js');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const games = new Map();
const waitingPlayers = [];

// ⏰ NOUVEAU SYSTÈME DE TIMER SIMPLE ET FIABLE
function startGameTimer(game, io) {
  // Nettoyer l'ancien timer s'il existe
  if (game.timer) {
    clearInterval(game.timer);
    game.timer = null;
  }
  
  console.log(`⏰ Timer démarré - Partie ${game.id} - Joueur: ${game.currentPlayer}`);
  
  const timer = setInterval(() => {
    // Arrêter si partie terminée
    if (game.status !== 'active') {
      console.log(`⏰ Timer arrêté - partie terminée`);
      clearInterval(timer);
      game.timer = null;
      return;
    }
    
    // Pour les parties amicales, pas de décompte
    if (game.isFriendlyGame) {
      io.to(game.id).emit('timeUpdate', {
        white: game.timeLeft.white,
        black: game.timeLeft.black,
        currentPlayer: game.currentPlayer
      });
      return;
    }
    
    // Décompter 1 seconde du joueur actuel
    if (game.currentPlayer === 'white') {
      game.timeLeft.white = Math.max(0, game.timeLeft.white - 1000);
    } else if (game.currentPlayer === 'black') {
      game.timeLeft.black = Math.max(0, game.timeLeft.black - 1000);
    }
    
    // Vérifier timeout
    if (game.timeLeft.white <= 0) {
      console.log(`⏰ TIMEOUT - Blancs perdent`);
      game.status = 'finished';
      game.winner = 'black';
      game.winReason = 'timeout';
      io.to(game.id).emit('gameOver', { winner: 'black', reason: 'timeout' });
      clearInterval(timer);
      game.timer = null;
      return;
    }
    
    if (game.timeLeft.black <= 0) {
      console.log(`⏰ TIMEOUT - Noirs perdent`);
      game.status = 'finished';
      game.winner = 'white';
      game.winReason = 'timeout';
      io.to(game.id).emit('gameOver', { winner: 'white', reason: 'timeout' });
      clearInterval(timer);
      game.timer = null;
      return;
    }
    
    // Envoyer mise à jour
    io.to(game.id).emit('timeUpdate', {
      white: game.timeLeft.white,
      black: game.timeLeft.black,
      currentPlayer: game.currentPlayer
    });
    
  }, 1000); // Exactement 1 seconde
  
  game.timer = timer;
}

async function createNewGame(player1, player2, isAgainstBot = false) {
  const gameId = randomUUID();
  const timeControl = 10 * 60 * 1000; // 10 minutes
  
  const game = {
    id: gameId,
    players: [player1, player2],
    chess: new Chess(),
    status: 'active',
    currentPlayer: 'white',
    timeLeft: { white: timeControl, black: timeControl },
    spectators: [],
    isFriendlyGame: false,
    isAgainstBot,
    botColor: isAgainstBot ? 'black' : null,
    timer: null
  };
  
  games.set(gameId, game);
  console.log(`🎮 Nouvelle partie créée: ${gameId} - Bot: ${isAgainstBot}`);
  
  return game;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Nouvelle connexion:', socket.id);

    socket.on('findGame', async (userData) => {
      if (!userData || !userData.username) {
        console.log('❌ Données utilisateur invalides:', userData);
        socket.emit('error', { message: 'Données utilisateur manquantes' });
        return;
      }
      console.log('🔍 Recherche de partie:', userData.username);
      
      // Chercher un adversaire humain
      const waitingPlayer = waitingPlayers.find(p => p.id !== socket.id);
      
      if (waitingPlayer) {
        // Partie humain vs humain
        waitingPlayers.splice(waitingPlayers.indexOf(waitingPlayer), 0);
        
        const game = await createNewGame(
          { id: socket.id, ...userData },
          { id: waitingPlayer.id, ...waitingPlayer.userData }
        );
        
        socket.join(game.id);
        waitingPlayer.socket.join(game.id);
        
        const gameData = {
          gameId: game.id,
          opponent: waitingPlayer.userData,
          color: 'white',
          fen: game.chess.fen(),
          timeLeft: game.timeLeft,
          currentPlayer: game.currentPlayer,
          moves: [],
          isFriendlyGame: false
        };
        
        socket.emit('gameFound', gameData);
        waitingPlayer.socket.emit('gameFound', {
          ...gameData,
          opponent: userData,
          color: 'black'
        });
        
        startGameTimer(game, io);
        
      } else {
        // Ajouter à la file d'attente
        const playerData = { id: socket.id, socket, userData };
        waitingPlayers.push(playerData);
        
        // Timeout pour créer une partie contre le bot
        setTimeout(() => {
          const playerIndex = waitingPlayers.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            waitingPlayers.splice(playerIndex, 1);
            
            // Créer partie contre bot
            createNewGame(
              { id: socket.id, ...userData },
              { id: 'bot', username: 'ChessBot 🤖', rating: 2000 },
              true
            ).then(game => {
              socket.join(game.id);
              
              socket.emit('gameFound', {
                gameId: game.id,
                opponent: { username: 'ChessBot 🤖', rating: 2000 },
                color: 'white',
                fen: game.chess.fen(),
                timeLeft: game.timeLeft,
                currentPlayer: game.currentPlayer,
                moves: [],
                isFriendlyGame: false
              });
              
              startGameTimer(game, io);
            });
          }
        }, 10000);
      }
    });

    socket.on('makeMove', async (data) => {
      const game = games.get(data.gameId);
      if (!game || game.status !== 'active') return;
      
      try {
        const moveResult = game.chess.move(data.move);
        if (moveResult) {
          // Changer le joueur actuel
          game.currentPlayer = game.chess.turn() === 'w' ? 'white' : 'black';
          
          io.to(game.id).emit('moveMade', {
            move: moveResult.san,
            fen: game.chess.fen(),
            currentPlayer: game.currentPlayer,
            moves: game.chess.history()
          });
          
          // Vérifier fin de partie
          if (game.chess.isGameOver()) {
            game.status = 'finished';
            let winner = null;
            let reason = 'draw';
            
            if (game.chess.isCheckmate()) {
              winner = game.chess.turn() === 'w' ? 'black' : 'white';
              reason = 'checkmate';
            }
            
            io.to(game.id).emit('gameOver', { winner, reason });
            if (game.timer) {
              clearInterval(game.timer);
              game.timer = null;
            }
            return;
          }
          
          // Si c'est contre le bot et c'est son tour
          if (game.isAgainstBot && game.currentPlayer === game.botColor) {
            // Pas de délai artificiel - le bot joue dès qu'il trouve le meilleur coup
            (async () => {
              try {
                console.log('🤖 Bot réfléchit...');
                const startTime = Date.now();
                const botMove = await getBestMove(game.chess.fen());
                const thinkTime = Date.now() - startTime;
                console.log(`🧠 Bot a réfléchi ${thinkTime}ms`);
                
                if (botMove) {
                  const botMoveResult = game.chess.move(botMove);
                  if (botMoveResult) {
                    game.currentPlayer = game.chess.turn() === 'w' ? 'white' : 'black';
                    console.log(`🤖 Bot joue: ${botMoveResult.san}`);
                    
                    io.to(game.id).emit('moveMade', {
                      move: botMoveResult.san,
                      fen: game.chess.fen(),
                      currentPlayer: game.currentPlayer,
                      moves: game.chess.history()
                    });
                    
                    // Vérifier fin de partie après coup du bot
                    if (game.chess.isGameOver()) {
                      game.status = 'finished';
                      let winner = null;
                      let reason = 'draw';
                      
                      if (game.chess.isCheckmate()) {
                        winner = game.chess.turn() === 'w' ? 'black' : 'white';
                        reason = 'checkmate';
                      }
                      
                      io.to(game.id).emit('gameOver', { winner, reason });
                      if (game.timer) {
                        clearInterval(game.timer);
                        game.timer = null;
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('❌ Erreur bot:', error);
              }
            })();
          }
          }
        }
      } catch (error) {
        console.error('❌ Erreur coup:', error);
      }
    });

    socket.on('offerDraw', (data) => {
      const game = games.get(data.gameId);
      if (!game) return;
      
      if (game.isAgainstBot) {
        socket.emit('drawDeclined');
      } else {
        socket.to(game.id).emit('drawOffered');
      }
    });

    socket.on('acceptDraw', (data) => {
      const game = games.get(data.gameId);
      if (!game) return;
      
      game.status = 'finished';
      game.winReason = 'agreement';
      io.to(game.id).emit('gameOver', { winner: null, reason: 'agreement' });
      
      if (game.timer) {
        clearInterval(game.timer);
        game.timer = null;
      }
    });

    socket.on('declineDraw', (data) => {
      const game = games.get(data.gameId);
      if (!game) return;
      
      socket.to(game.id).emit('drawDeclined');
    });

    socket.on('resign', (data) => {
      const game = games.get(data.gameId);
      if (!game) return;
      
      const playerColor = game.players[0].id === socket.id ? 'white' : 'black';
      const winner = playerColor === 'white' ? 'black' : 'white';
      
      game.status = 'finished';
      game.winner = winner;
      game.winReason = 'resignation';
      
      io.to(game.id).emit('gameOver', { winner, reason: 'resignation' });
      
      if (game.timer) {
        clearInterval(game.timer);
        game.timer = null;
      }
    });

    socket.on('leaveGame', (data) => {
      if (data?.gameId) {
        socket.leave(data.gameId);
      }
      
      const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
      if (waitingIndex !== -1) {
        waitingPlayers.splice(waitingIndex, 1);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Déconnexion:', socket.id);
      
      const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
      if (waitingIndex !== -1) {
        waitingPlayers.splice(waitingIndex, 1);
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  });
});
