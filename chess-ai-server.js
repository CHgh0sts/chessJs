const { Chess } = require('chess.js');

// Valeurs des pièces pour l'évaluation
const PIECE_VALUES = {
  'p': 100,   // Pion
  'n': 320,   // Cavalier
  'b': 330,   // Fou
  'r': 500,   // Tour
  'q': 900,   // Dame
  'k': 20000  // Roi
};

// Tables de position pour encourager de bonnes positions
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

// Convertir position d'échecs en index de tableau
function squareToIndex(square) {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  return rank * 8 + file;
}

// Cache pour les évaluations
const evaluationCache = new Map();

// Évaluer la position du plateau (optimisé)
function evaluateBoard(chess) {
  const fen = chess.fen();
  
  // Vérifier le cache
  if (evaluationCache.has(fen)) {
    return evaluationCache.get(fen);
  }
  
  let totalEvaluation = 0;
  const board = chess.board();
  
  // Évaluation rapide basée sur le matériel principalement
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const index = i * 8 + j; // Calcul direct de l'index
        
        let pieceValue = PIECE_VALUES[piece.type];
        let positionValue = 0;
        
        // Évaluation de position simplifiée pour la vitesse
        switch (piece.type) {
          case 'p':
            positionValue = piece.color === 'w' ? PAWN_TABLE[index] : PAWN_TABLE[63 - index];
            break;
          case 'n':
            positionValue = piece.color === 'w' ? KNIGHT_TABLE[index] : KNIGHT_TABLE[63 - index];
            break;
          case 'b':
            positionValue = piece.color === 'w' ? BISHOP_TABLE[index] : BISHOP_TABLE[63 - index];
            break;
          case 'r':
            positionValue = piece.color === 'w' ? ROOK_TABLE[index] : ROOK_TABLE[63 - index];
            break;
          case 'q':
            positionValue = piece.color === 'w' ? QUEEN_TABLE[index] : QUEEN_TABLE[63 - index];
            break;
          case 'k':
            positionValue = piece.color === 'w' ? KING_TABLE[index] : KING_TABLE[63 - index];
            break;
        }
        
        const totalValue = pieceValue + positionValue * 0.5; // Réduire l'impact des positions pour la vitesse
        totalEvaluation += piece.color === 'w' ? totalValue : -totalValue;
      }
    }
  }
  
  // Limiter la taille du cache
  if (evaluationCache.size > 1000) {
    evaluationCache.clear();
  }
  
  evaluationCache.set(fen, totalEvaluation);
  return totalEvaluation;
}

// Algorithme Minimax optimisé avec élagage Alpha-Beta
function minimax(chess, depth, alpha, beta, maximizingPlayer) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }
  
  const moves = chess.moves();
  
  // Optimisation : ordonner les coups pour un meilleur élagage
  const orderedMoves = orderMoves(chess, moves);
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of orderedMoves) {
      chess.move(move);
      const eval = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) {
        break; // Élagage Alpha-Beta
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of orderedMoves) {
      chess.move(move);
      const eval = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) {
        break; // Élagage Alpha-Beta
      }
    }
    return minEval;
  }
}

// Ordonner les coups pour améliorer l'élagage Alpha-Beta
function orderMoves(chess, moves) {
  const orderedMoves = [];
  const captures = [];
  const others = [];
  
  for (const move of moves) {
    const moveObj = chess.move(move);
    if (moveObj.captured) {
      captures.push(move);
    } else {
      others.push(move);
    }
    chess.undo();
  }
  
  // Prioriser les captures puis les autres coups
  return [...captures, ...others];
}

// Trouver le meilleur coup (optimisé pour la vitesse)
function getBestMove(chess, depth = 3) { // Réduire la profondeur de 4 à 3
  const moves = chess.moves();
  if (moves.length === 0) return null;
  
  // Retour rapide pour les premiers coups
  if (moves.length > 20) {
    // En début de partie, jouer des coups d'ouverture classiques
    const goodOpeningMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'd4', 'd5'];
    for (const openingMove of goodOpeningMoves) {
      if (moves.includes(openingMove)) {
        return openingMove;
      }
    }
  }
  
  let bestMove = null;
  let bestValue = -Infinity;
  const isWhite = chess.turn() === 'w';
  
  // Ordonner les coups pour un meilleur élagage
  const orderedMoves = orderMoves(chess, moves);
  
  // Limiter le nombre de coups évalués en fin de partie
  const movesToEvaluate = orderedMoves.slice(0, Math.min(15, orderedMoves.length));
  
  for (const move of movesToEvaluate) {
    chess.move(move);
    const value = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();
    
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  
  return bestMove || moves[0]; // Fallback au premier coup si aucun trouvé
}

// Créer un utilisateur bot
function createBotUser() {
  return {
    id: 'bot-' + Math.random().toString(36).substr(2, 9),
    username: 'ChessBot 🤖',
    email: 'bot@chess.local',
    rating: 2000, // Rating élevé pour un bot fort
    gamesPlayed: 999,
    gamesWon: 800,
    gamesLost: 150,
    gamesDraw: 49,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

module.exports = {
  getBestMove,
  createBotUser,
  evaluateBoard
};
