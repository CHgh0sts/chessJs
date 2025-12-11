const { Chess } = require('chess.js');

// Valeurs des pièces pour l'évaluation (ajustées)
const PIECE_VALUES = {
  'p': 100,   // Pion
  'n': 320,   // Cavalier
  'b': 330,   // Fou
  'r': 500,   // Tour
  'q': 900,   // Dame
  'k': 20000  // Roi
};

// Bonus pour les coups tactiques (captures équilibrées)
const TACTICAL_BONUS = {
  CAPTURE: 50,   // Bonus modéré - l'évaluation SEE fait le travail
  CHECK: 30,
  CASTLE: 40,
  PROMOTION: 800,
  CENTER_CONTROL: 20,
  PIECE_DEVELOPMENT: 15
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

// Évaluer la position du plateau (amélioré)
function evaluateBoard(chess) {
  const fen = chess.fen();
  
  // Vérifier le cache
  if (evaluationCache.has(fen)) {
    return evaluationCache.get(fen);
  }
  
  let totalEvaluation = 0;
  const board = chess.board();
  
  // Évaluation du matériel et des positions
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const index = i * 8 + j;
        
        let pieceValue = PIECE_VALUES[piece.type];
        let positionValue = 0;
        
        // Évaluation de position selon le type de pièce
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
  
  // Facteurs tactiques additionnels
  const moves = chess.moves();
  totalEvaluation += moves.length * (chess.turn() === 'w' ? 2 : -2); // Mobilité
  
  // Pénalité pour être en échec
  if (chess.inCheck()) {
    totalEvaluation += chess.turn() === 'w' ? -50 : 50;
  }
  
  // Bonus pour le contrôle du centre
  const centerControl = evaluateCenterControl(chess);
  totalEvaluation += centerControl;
  
  // Limiter la taille du cache
  if (evaluationCache.size > 1000) {
    evaluationCache.clear();
  }
  
  evaluationCache.set(fen, totalEvaluation);
  return totalEvaluation;
}

// Évaluer le contrôle du centre
function evaluateCenterControl(chess) {
  let centerControl = 0;
  const centerSquares = ['e4', 'e5', 'd4', 'd5'];
  
  for (const square of centerSquares) {
    const piece = chess.get(square);
    if (piece) {
      centerControl += piece.color === 'w' ? 10 : -10;
    }
  }
  
  return centerControl;
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

// Évaluer la qualité d'un coup
function evaluateMove(chess, move) {
  const moveObj = chess.move(move);
  let score = 0;
  
  // Bonus pour les captures (évaluation normale)
  if (moveObj.captured) {
    score += PIECE_VALUES[moveObj.captured] + TACTICAL_BONUS.CAPTURE;
  }
  
  // Bonus pour les échecs
  if (chess.inCheck()) {
    score += TACTICAL_BONUS.CHECK;
  }
  
  // Bonus pour le roque
  if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
    score += TACTICAL_BONUS.CASTLE;
  }
  
  // Bonus pour la promotion
  if (moveObj.promotion) {
    score += TACTICAL_BONUS.PROMOTION;
  }
  
  // Bonus pour le contrôle du centre (e4, e5, d4, d5)
  const centerSquares = ['e4', 'e5', 'd4', 'd5'];
  if (centerSquares.includes(moveObj.to)) {
    score += TACTICAL_BONUS.CENTER_CONTROL;
  }
  
  // Bonus pour le développement des pièces (sortir de la première rangée)
  if (moveObj.piece !== 'p' && (moveObj.from[1] === '1' || moveObj.from[1] === '8')) {
    score += TACTICAL_BONUS.PIECE_DEVELOPMENT;
  }
  
  chess.undo();
  return { move, score };
}

// Ordonner les coups pour améliorer l'élagage Alpha-Beta
function orderMoves(chess, moves) {
  const evaluatedMoves = moves.map(move => evaluateMove(chess, move));
  
  // Trier par score décroissant
  evaluatedMoves.sort((a, b) => b.score - a.score);
  
  return evaluatedMoves.map(item => item.move);
}

// Trouver le meilleur coup (évaluation intelligente des captures)
function getBestMove(chess, depth = 3) {
  const moves = chess.moves();
  if (moves.length === 0) return null;
  
  // Vérifier s'il y a des captures VRAIMENT bonnes (gratuites ou très profitables)
  const goodCaptures = findGoodCaptures(chess, moves);
  if (goodCaptures.length > 0) {
    console.log(`🎯 Bot trouve ${goodCaptures.length} bonne(s) capture(s):`, goodCaptures.map(c => `${c.move} (+${c.finalScore})`));
    
    // Prendre la meilleure capture profitable
    const bestCapture = goodCaptures[0]; // Déjà triées par score
    console.log(`🎯 Bot choisit la capture: ${bestCapture.move} (gain net: +${bestCapture.finalScore})`);
    return bestCapture.move;
  }
  
  const moveCount = chess.history().length;
  
  // Livre d'ouverture seulement si pas de bonnes captures
  if (moveCount < 6) {
    const openingBook = getOpeningMove(chess, moveCount);
    if (openingBook && moves.includes(openingBook)) {
      return openingBook;
    }
  }
  
  let bestMove = null;
  let bestValue = -Infinity;
  const isWhite = chess.turn() === 'w';
  
  // Ordonner les coups pour un meilleur élagage
  const orderedMoves = orderMoves(chess, moves);
  
  // Évaluer tous les coups importants
  const movesToEvaluate = orderedMoves.slice(0, Math.min(20, orderedMoves.length));
  
  for (const move of movesToEvaluate) {
    chess.move(move);
    const value = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();
    
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  
  return bestMove || moves[0];
}

// Trouver seulement les BONNES captures (profitables ou sûres)
function findGoodCaptures(chess, moves) {
  const goodCaptures = [];
  
  for (const move of moves) {
    const moveObj = chess.move(move);
    if (moveObj.captured) {
      const captureValue = PIECE_VALUES[moveObj.captured];
      const attackerValue = PIECE_VALUES[moveObj.piece];
      
      // Analyser la sécurité de la capture
      const attackers = getAttackers(chess, moveObj.to, moveObj.color === 'w' ? 'b' : 'w');
      const defenders = getAttackers(chess, moveObj.to, moveObj.color);
      
      // Calculer l'échange complet (SEE - Static Exchange Evaluation)
      const exchangeValue = calculateExchange(captureValue, attackerValue, attackers, defenders);
      
      console.log(`📊 Analyse capture ${move}: ${moveObj.piece}x${moveObj.captured} = ${exchangeValue > 0 ? '+' : ''}${exchangeValue}`);
      
      // Seulement garder les captures profitables ou égales
      if (exchangeValue >= 0) {
        goodCaptures.push({
          move: move,
          captured: moveObj.captured,
          captureValue: captureValue,
          attackerValue: attackerValue,
          exchangeValue: exchangeValue,
          finalScore: exchangeValue + (exchangeValue > 0 ? 50 : 0) // Bonus pour gain net
        });
      } else {
        console.log(`❌ Capture ${move} rejetée: perte de ${-exchangeValue} points`);
      }
    }
    chess.undo();
  }
  
  // Trier par score final décroissant
  goodCaptures.sort((a, b) => b.finalScore - a.finalScore);
  
  return goodCaptures;
}

// Calculer l'échange complet (Static Exchange Evaluation)
function calculateExchange(captureValue, attackerValue, attackers, defenders) {
  // Simulation simple de l'échange
  let gain = captureValue; // On gagne la pièce capturée
  let loss = 0;
  
  // Si la case est défendue, on risque de perdre notre pièce
  if (attackers.length > 0) {
    // Prendre la pièce la moins valuable qui peut nous attaquer
    const cheapestAttacker = Math.min(...attackers);
    if (cheapestAttacker <= attackerValue) {
      loss = attackerValue; // On perd notre pièce
      
      // Si on a des défenseurs, on peut reprendre
      if (defenders.length > 0) {
        const cheapestDefender = Math.min(...defenders);
        gain += cheapestAttacker; // On reprend leur pièce
        
        // Simplification: on s'arrête là pour éviter la complexité
      }
    }
  }
  
  return gain - loss;
}

// Obtenir les valeurs des pièces qui attaquent une case
function getAttackers(chess, square, color) {
  const attackers = [];
  const moves = chess.moves({ verbose: true });
  
  for (const move of moves) {
    if (move.to === square && chess.get(move.from) && chess.get(move.from).color === color) {
      const piece = chess.get(move.from);
      attackers.push(PIECE_VALUES[piece.type]);
    }
  }
  
  return attackers;
}

// Fonction supprimée - remplacée par getAttackers() plus précise

// Livre d'ouverture intelligent
function getOpeningMove(chess, moveCount) {
  const history = chess.history();
  
  // Premier coup des blancs
  if (moveCount === 0) {
    return Math.random() < 0.6 ? 'e4' : 'd4'; // Favoriser e4
  }
  
  // Réponses aux premiers coups des blancs
  if (moveCount === 1) {
    const lastMove = history[0];
    if (lastMove === 'e4') return Math.random() < 0.5 ? 'e5' : 'c5';
    if (lastMove === 'd4') return Math.random() < 0.5 ? 'd5' : 'Nf6';
  }
  
  // Développement des pièces
  if (moveCount < 6) {
    const developmentMoves = ['Nf3', 'Nc3', 'Bc4', 'Bb5', 'Be2', 'Nf6', 'Nc6', 'Bc5', 'Be7'];
    for (const move of developmentMoves) {
      if (chess.moves().includes(move)) {
        // Vérifier que le coup développe vraiment une pièce
        const moveObj = chess.move(move);
        const isDevelopment = moveObj.piece !== 'p' && 
                            (moveObj.from[1] === '1' || moveObj.from[1] === '8' || 
                             moveObj.from[1] === '2' || moveObj.from[1] === '7');
        chess.undo();
        if (isDevelopment) return move;
      }
    }
  }
  
  return null;
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
