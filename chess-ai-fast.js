const { Chess } = require('chess.js');

// Système d'apprentissage - Coups à éviter
const badMoves = new Map(); // FEN -> Set de coups à éviter
const goodMoves = new Map(); // FEN -> Set de bons coups

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
  
  console.log(`🚀 Bot rapide évalue ${moves.length} coups`);
  
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
  
  // 2. Captures profitables
  const captures = [];
  for (const move of moves) {
    const testChess = new Chess(chess.fen());
    const result = testChess.move(move);
    if (result && result.captured) {
      const capturedValue = PIECE_VALUES[result.captured] || 0;
      const movingPiece = result.piece;
      const movingValue = PIECE_VALUES[movingPiece] || 0;
      
      // Capture profitable si on prend plus qu'on risque
      if (capturedValue >= movingValue) {
        captures.push({ move, value: capturedValue });
      }
    }
  }
  
  if (captures.length > 0) {
    // Prendre la capture la plus profitable
    captures.sort((a, b) => b.value - a.value);
    console.log(`🎯 Bot capture: ${captures[0].move} (valeur: ${captures[0].value})`);
    return captures[0].move;
  }
  
  // 3. Développement en début de partie
  const moveCount = chess.history().length;
  if (moveCount < 10) {
    const developmentMoves = moves.filter(move => 
      move.includes('N') || move.includes('B') || 
      move.includes('e4') || move.includes('d4') || 
      move.includes('e5') || move.includes('d5')
    );
    
    if (developmentMoves.length > 0) {
      const devMove = developmentMoves[0];
      console.log(`🏗️ Bot développe: ${devMove}`);
      return devMove;
    }
  }
  
  // 4. Coups centraux
  const centralMoves = moves.filter(move => 
    move.includes('e') || move.includes('d')
  );
  
  if (centralMoves.length > 0) {
    const centralMove = centralMoves[0];
    console.log(`🎯 Bot joue central: ${centralMove}`);
    return centralMove;
  }
  
  // 5. Coup aléatoire
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  console.log(`🎲 Bot joue: ${randomMove}`);
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

module.exports = { getBestMove, learnBadMove, learnGoodMove, analyzeGame };
