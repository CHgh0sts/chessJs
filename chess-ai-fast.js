const { Chess } = require('chess.js');

// Système d'apprentissage - Coups à éviter
const badMoves = new Map(); // FEN -> Set de coups à éviter
const goodMoves = new Map(); // FEN -> Set de bons coups

// Personnalités du bot pour varier le style
const personalities = ['aggressive', 'positional', 'creative', 'solid'];
let currentPersonality = personalities[Math.floor(Math.random() * personalities.length)];

// Changer de personnalité de temps en temps
function maybeChangePersonality() {
  if (Math.random() < 0.1) { // 10% de chance de changer
    const oldPersonality = currentPersonality;
    currentPersonality = personalities[Math.floor(Math.random() * personalities.length)];
    if (oldPersonality !== currentPersonality) {
      console.log(`🎭 Bot change de style: ${oldPersonality} → ${currentPersonality}`);
    }
  }
}

// Fonction pour apprendre d'un mauvais coup
function learnBadMove(fen, move) {
  if (!badMoves.has(fen)) {
    badMoves.set(fen, new Set());
  }
  badMoves.get(fen).add(move);
  console.log(`🧠 Apprentissage: Éviter ${move} sur position ${fen.substring(0, 20)}...`);
}

// Fonction pour apprendre d'un bon coup
function learnGoodMove(fen, move) {
  if (!goodMoves.has(fen)) {
    goodMoves.set(fen, new Set());
  }
  goodMoves.get(fen).add(move);
  console.log(`✅ Apprentissage: Favoriser ${move} sur position ${fen.substring(0, 20)}...`);
}

// Valeurs des pièces
const PIECE_VALUES = {
  'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000
};

// Bot rapide et intelligent
function getBestMove(fen) {
  const chess = new Chess(fen);
  let moves = chess.moves();
  if (moves.length === 0) return null;
  
  console.log(`🚀 Bot rapide évalue ${moves.length} coups (style: ${currentPersonality})`);
  maybeChangePersonality();
  
  // Filtrer les coups appris comme mauvais
  if (badMoves.has(fen)) {
    const badMovesForPosition = badMoves.get(fen);
    const originalCount = moves.length;
    moves = moves.filter(move => !badMovesForPosition.has(move));
    if (moves.length < originalCount) {
      console.log(`🧠 ${originalCount - moves.length} coups évités grâce à l'apprentissage`);
    }
  }
  
  // Privilégier les coups appris comme bons
  if (goodMoves.has(fen)) {
    const goodMovesForPosition = goodMoves.get(fen);
    const learnedGoodMoves = moves.filter(move => goodMovesForPosition.has(move));
    if (learnedGoodMoves.length > 0) {
      console.log(`✅ Coup appris favorisé: ${learnedGoodMoves[0]}`);
      return learnedGoodMoves[0];
    }
  }
  
  // 1. Si en échec, fuir
  if (chess.inCheck()) {
    const kingMoves = moves.filter(move => move.includes('K'));
    if (kingMoves.length > 0) {
      console.log(`👑 Roi en échec - fuite: ${kingMoves[0]}`);
      return kingMoves[0];
    }
  }
  
  // 2. Captures selon la personnalité
  const captures = [];
  for (const move of moves) {
    const testChess = new Chess(chess.fen());
    const result = testChess.move(move);
    if (result && result.captured) {
      const capturedValue = PIECE_VALUES[result.captured] || 0;
      const movingPiece = result.piece;
      const movingValue = PIECE_VALUES[movingPiece] || 0;
      
      // Logique selon personnalité
      let shouldCapture = false;
      if (currentPersonality === 'aggressive') {
        shouldCapture = capturedValue > 0; // Capture tout
      } else if (currentPersonality === 'creative') {
        shouldCapture = Math.random() > 0.3; // 70% des captures
      } else {
        shouldCapture = capturedValue >= movingValue; // Captures profitables
      }
      
      if (shouldCapture) {
        captures.push({ move, value: capturedValue });
      }
    }
  }
  
  if (captures.length > 0) {
    captures.sort((a, b) => b.value - a.value);
    const captureChoice = currentPersonality === 'creative' ? 
      captures[Math.floor(Math.random() * Math.min(captures.length, 2))] : // Choix créatif
      captures[0]; // Meilleure capture
    console.log(`🎯 Bot capture (${currentPersonality}): ${captureChoice.move} (valeur: ${captureChoice.value})`);
    return captureChoice.move;
  }
  
  // 3. Développement varié en début de partie
  const moveCount = chess.history().length;
  if (moveCount < 12) {
    // Ouvertures variées selon le coup
    let openingMoves = [];
    
    if (moveCount < 3) {
      // Premiers coups très variés
      openingMoves = moves.filter(move => 
        move.includes('e4') || move.includes('d4') || move.includes('Nf3') || 
        move.includes('c4') || move.includes('g3') || move.includes('b3') ||
        move.includes('e5') || move.includes('d5') || move.includes('Nf6') ||
        move.includes('c5') || move.includes('g6') || move.includes('b6')
      );
    } else if (moveCount < 8) {
      // Développement créatif
      openingMoves = moves.filter(move => 
        move.includes('N') || move.includes('B') || move.includes('O-O') ||
        move.includes('c') || move.includes('f') || move.includes('g') ||
        move.includes('h3') || move.includes('h6') || move.includes('a3') || move.includes('a6')
      );
    } else {
      // Milieu d'ouverture
      openingMoves = moves.filter(move => 
        move.includes('Q') || move.includes('R') || move.includes('O-O') ||
        move.includes('c') || move.includes('f') || move.includes('e') || move.includes('d')
      );
    }
    
    if (openingMoves.length > 0) {
      // Choisir aléatoirement parmi les bons coups d'ouverture
      const randomIndex = Math.floor(Math.random() * Math.min(openingMoves.length, 3));
      const devMove = openingMoves[randomIndex];
      console.log(`🎨 Bot varie (${moveCount}e coup): ${devMove}`);
      return devMove;
    }
  }
  
  // 4. Coups tactiques variés
  const tacticalMoves = moves.filter(move => 
    move.includes('+') || move.includes('x') || // Échecs et captures
    move.includes('O-O') || move.includes('=') || // Roques et promotions
    move.includes('e') || move.includes('d') || move.includes('f') || move.includes('c') // Coups centraux
  );
  
  if (tacticalMoves.length > 0) {
    // Choisir parmi les 3 premiers coups tactiques
    const randomIndex = Math.floor(Math.random() * Math.min(tacticalMoves.length, 3));
    const tacticalMove = tacticalMoves[randomIndex];
    console.log(`⚡ Bot joue tactique: ${tacticalMove}`);
    return tacticalMove;
  }
  
  // 5. Coup créatif aléatoire (parmi les meilleurs)
  const creativeMoves = moves.slice(0, Math.min(moves.length, 5)); // Top 5 coups
  const randomMove = creativeMoves[Math.floor(Math.random() * creativeMoves.length)];
  console.log(`🎨 Bot créatif: ${randomMove}`);
  return randomMove;
}

// Analyser une partie terminée pour apprendre
function analyzeGame(gameHistory, winner) {
  if (gameHistory.length < 4) return;
  
  // Si le bot a perdu, apprendre des derniers coups
  if (winner !== 'bot') {
    const lastBotMoves = gameHistory.filter((_, index) => index % 2 === 1).slice(-3);
    lastBotMoves.forEach(move => {
      // Simuler la position pour obtenir le FEN (simplifié)
      console.log(`🤔 Analyser coup potentiellement mauvais: ${move}`);
      // TODO: Implémenter l'analyse complète
    });
  }
}

// Fonction améliorée qui analyse le type de coup pour le temps de réflexion
function getBestMoveWithAnalysis(fen) {
  const chess = new Chess(fen);
  let moves = chess.moves();
  if (moves.length === 0) return { move: null, moveType: 'none' };
  
  console.log(`🚀 Bot rapide évalue ${moves.length} coups (style: ${currentPersonality})`);
  maybeChangePersonality();
  
  // Filtrer les coups appris comme mauvais
  if (badMoves.has(fen)) {
    const badMovesForPosition = badMoves.get(fen);
    const originalCount = moves.length;
    moves = moves.filter(move => !badMovesForPosition.has(move));
    if (moves.length < originalCount) {
      console.log(`🧠 ${originalCount - moves.length} coups évités grâce à l'apprentissage`);
    }
  }
  
  // Privilégier les coups appris comme bons
  if (goodMoves.has(fen)) {
    const goodMovesForPosition = goodMoves.get(fen);
    const learnedGoodMoves = moves.filter(move => goodMovesForPosition.has(move));
    if (learnedGoodMoves.length > 0) {
      console.log(`✅ Coup appris favorisé: ${learnedGoodMoves[0]}`);
      return { move: learnedGoodMoves[0], moveType: 'learned' };
    }
  }
  
  // 1. Si en échec, fuir (urgent)
  if (chess.inCheck()) {
    const kingMoves = moves.filter(move => move.includes('K'));
    if (kingMoves.length > 0) {
      console.log(`👑 Roi en échec - fuite: ${kingMoves[0]}`);
      return { move: kingMoves[0], moveType: 'escape' };
    }
  }
  
  // 2. Captures selon la personnalité
  const captures = [];
  for (const move of moves) {
    const testChess = new Chess(chess.fen());
    const result = testChess.move(move);
    if (result && result.captured) {
      const capturedValue = PIECE_VALUES[result.captured] || 0;
      const movingPiece = result.piece;
      const movingValue = PIECE_VALUES[movingPiece] || 0;
      
      // Logique selon personnalité
      let shouldCapture = false;
      if (currentPersonality === 'aggressive') {
        shouldCapture = capturedValue > 0; // Capture tout
      } else if (currentPersonality === 'creative') {
        shouldCapture = Math.random() > 0.3; // 70% des captures
      } else {
        shouldCapture = capturedValue >= movingValue; // Captures profitables
      }
      
      if (shouldCapture) {
        captures.push({ move, value: capturedValue });
      }
    }
  }
  
  if (captures.length > 0) {
    captures.sort((a, b) => b.value - a.value);
    const captureChoice = currentPersonality === 'creative' ? 
      captures[Math.floor(Math.random() * Math.min(captures.length, 2))] : // Choix créatif
      captures[0]; // Meilleure capture
    
    const moveType = captureChoice.value >= 300 ? 'good_capture' : 'small_capture';
    console.log(`🎯 Bot capture (${currentPersonality}): ${captureChoice.move} (valeur: ${captureChoice.value})`);
    return { move: captureChoice.move, moveType };
  }
  
  // 3. Développement varié en début de partie
  const moveCount = chess.history().length;
  if (moveCount < 12) {
    // Ouvertures variées selon le coup
    let openingMoves = [];
    
    if (moveCount < 3) {
      // Premiers coups très variés
      openingMoves = moves.filter(move => 
        move.includes('e4') || move.includes('d4') || move.includes('Nf3') || 
        move.includes('c4') || move.includes('g3') || move.includes('b3') ||
        move.includes('e5') || move.includes('d5') || move.includes('Nf6') ||
        move.includes('c5') || move.includes('g6') || move.includes('b6')
      );
    } else if (moveCount < 8) {
      // Développement créatif
      openingMoves = moves.filter(move => 
        move.includes('N') || move.includes('B') || move.includes('O-O') ||
        move.includes('c') || move.includes('f') || move.includes('g') ||
        move.includes('h3') || move.includes('h6') || move.includes('a3') || move.includes('a6')
      );
    } else {
      // Milieu d'ouverture
      openingMoves = moves.filter(move => 
        move.includes('Q') || move.includes('R') || move.includes('O-O') ||
        move.includes('c') || move.includes('f') || move.includes('e') || move.includes('d')
      );
    }
    
    if (openingMoves.length > 0) {
      // Choisir aléatoirement parmi les bons coups d'ouverture
      const randomIndex = Math.floor(Math.random() * Math.min(openingMoves.length, 3));
      const devMove = openingMoves[randomIndex];
      console.log(`🎨 Bot varie (${moveCount}e coup): ${devMove}`);
      return { move: devMove, moveType: 'opening' };
    }
  }
  
  // 4. Coups tactiques variés
  const tacticalMoves = moves.filter(move => 
    move.includes('+') || move.includes('x') || // Échecs et captures
    move.includes('O-O') || move.includes('=') || // Roques et promotions
    move.includes('e') || move.includes('d') || move.includes('f') || move.includes('c') // Coups centraux
  );
  
  if (tacticalMoves.length > 0) {
    // Choisir parmi les 3 premiers coups tactiques
    const randomIndex = Math.floor(Math.random() * Math.min(tacticalMoves.length, 3));
    const tacticalMove = tacticalMoves[randomIndex];
    console.log(`⚡ Bot joue tactique: ${tacticalMove}`);
    return { move: tacticalMove, moveType: 'tactical' };
  }
  
  // 5. Coup créatif aléatoire (parmi les meilleurs)
  const creativeMoves = moves.slice(0, Math.min(moves.length, 5)); // Top 5 coups
  const randomMove = creativeMoves[Math.floor(Math.random() * creativeMoves.length)];
  console.log(`🎨 Bot créatif: ${randomMove}`);
  return { move: randomMove, moveType: 'positional' };
}

module.exports = { getBestMove, getBestMoveWithAnalysis, learnBadMove, learnGoodMove, analyzeGame };
