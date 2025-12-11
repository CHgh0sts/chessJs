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

// Évaluer la position du plateau
function evaluateBoard(chess) {
  let totalEvaluation = 0;
  const board = chess.board();
  
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const square = String.fromCharCode('a'.charCodeAt(0) + j) + (i + 1);
        const index = squareToIndex(square);
        
        let pieceValue = PIECE_VALUES[piece.type];
        let positionValue = 0;
        
        // Ajouter la valeur de position selon le type de pièce
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
        
        const totalValue = pieceValue + positionValue;
        totalEvaluation += piece.color === 'w' ? totalValue : -totalValue;
      }
    }
  }
  
  return totalEvaluation;
}

// Algorithme Minimax avec élagage Alpha-Beta
function minimax(chess, depth, alpha, beta, maximizingPlayer) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }
  
  const moves = chess.moves();
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
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
    for (const move of moves) {
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

// Trouver le meilleur coup
function getBestMove(chess, depth = 4) {
  const moves = chess.moves();
  if (moves.length === 0) return null;
  
  let bestMove = null;
  let bestValue = -Infinity;
  const isWhite = chess.turn() === 'w';
  
  // Mélanger les coups pour éviter la prévisibilité
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5);
  
  for (const move of shuffledMoves) {
    chess.move(move);
    const value = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();
    
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  
  return bestMove;
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
