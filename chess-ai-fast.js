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
function analyzeGame(gameHistory, winner, botColor = 'black') {
  if (gameHistory.length < 6) return; // Au moins 3 coups de chaque côté
  
  console.log(`📊 Analyse de partie - Gagnant: ${winner}, Bot jouait: ${botColor}`);
  
  try {
    // Reconstruire la partie pour analyser les positions
    const chess = new Chess();
    const positions = [chess.fen()]; // Position initiale
    
    // Rejouer tous les coups pour obtenir les positions
    gameHistory.forEach((move, index) => {
      try {
        chess.move(move);
        positions.push(chess.fen());
      } catch (error) {
        console.log(`⚠️ Coup invalide lors de l'analyse: ${move} à l'index ${index}`);
        return;
      }
    });
    
    // Déterminer si le bot a gagné, perdu ou fait match nul
    const botWon = (winner === botColor) || (winner === 'bot');
    const botLost = winner !== 'draw' && !botWon;
    
    if (botLost) {
      console.log(`😔 Bot a perdu - Analyse des erreurs`);
      
      // Analyser les 4 derniers coups du bot pour identifier les erreurs
      const botMoveIndices = [];
      gameHistory.forEach((move, index) => {
        const isBotMove = (botColor === 'white' && index % 2 === 0) || 
                         (botColor === 'black' && index % 2 === 1);
        if (isBotMove) {
          botMoveIndices.push(index);
        }
      });
      
      // Prendre les 4 derniers coups du bot
      const lastBotMoves = botMoveIndices.slice(-4);
      
      lastBotMoves.forEach(moveIndex => {
        const move = gameHistory[moveIndex];
        const positionBefore = positions[moveIndex];
        const positionAfter = positions[moveIndex + 1];
        
        if (positionBefore && positionAfter) {
          // Analyser si ce coup était une erreur
          const wasBlunder = analyzeMove(positionBefore, move, positionAfter);
          
          if (wasBlunder) {
            console.log(`💥 Coup identifié comme erreur: ${move} (position ${moveIndex + 1})`);
            learnBadMove(positionBefore, move);
          }
        }
      });
      
    } else if (botWon) {
      console.log(`🎉 Bot a gagné - Renforcement des bons coups`);
      
      // Renforcer les coups qui ont mené à la victoire
      const botMoveIndices = [];
      gameHistory.forEach((move, index) => {
        const isBotMove = (botColor === 'white' && index % 2 === 0) || 
                         (botColor === 'black' && index % 2 === 1);
        if (isBotMove) {
          botMoveIndices.push(index);
        }
      });
      
      // Prendre les 3 derniers coups du bot (ceux qui ont mené à la victoire)
      const winningMoves = botMoveIndices.slice(-3);
      
      winningMoves.forEach(moveIndex => {
        const move = gameHistory[moveIndex];
        const positionBefore = positions[moveIndex];
        
        if (positionBefore) {
          console.log(`✨ Renforcement du bon coup: ${move}`);
          learnGoodMove(positionBefore, move);
        }
      });
    }
    
    // Statistiques d'apprentissage
    console.log(`🧠 Apprentissage - Mauvais coups mémorisés: ${badMoves.size}, Bons coups: ${goodMoves.size}`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse de partie:`, error);
  }
}

// Analyser si un coup spécifique était une erreur
function analyzeMove(fenBefore, move, fenAfter) {
  try {
    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfter);
    
    // Vérifier si le coup a mis le roi en danger
    if (chessAfter.inCheck()) {
      console.log(`⚠️ Coup ${move} a mis le roi en échec`);
      return true; // Probablement une erreur si on se met en échec
    }
    
    // Vérifier si le coup a perdu du matériel sans compensation
    const materialBefore = calculateMaterialValue(chessBefore);
    const materialAfter = calculateMaterialValue(chessAfter);
    
    const currentPlayer = chessBefore.turn();
    const materialLoss = currentPlayer === 'w' ? 
      materialBefore.white - materialAfter.white : 
      materialBefore.black - materialAfter.black;
    
    if (materialLoss > 200) { // Perte significative de matériel
      console.log(`💰 Coup ${move} a perdu ${materialLoss} points de matériel`);
      return true;
    }
    
    // Vérifier si le coup permet à l'adversaire de faire une grosse capture au prochain tour
    const opponentMoves = chessAfter.moves({ verbose: true });
    const dangerousCaptures = opponentMoves.filter(oppMove => 
      oppMove.captured && PIECE_VALUES[oppMove.captured] >= 300
    );
    
    if (dangerousCaptures.length > 0) {
      console.log(`🎯 Coup ${move} permet une capture dangereuse: ${dangerousCaptures[0].san}`);
      return true;
    }
    
    return false; // Le coup semble correct
    
  } catch (error) {
    console.log(`⚠️ Erreur analyse du coup ${move}:`, error.message);
    return false;
  }
}

// Calculer la valeur matérielle totale pour chaque camp
function calculateMaterialValue(chess) {
  let whiteValue = 0;
  let blackValue = 0;
  
  const board = chess.board();
  
  board.forEach(row => {
    row.forEach(square => {
      if (square) {
        const pieceValue = PIECE_VALUES[square.type] || 0;
        if (square.color === 'w') {
          whiteValue += pieceValue;
        } else {
          blackValue += pieceValue;
        }
      }
    });
  });
  
  return { white: whiteValue, black: blackValue };
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

module.exports = { getBestMove, getBestMoveWithAnalysis, learnBadMove, learnGoodMove, analyzeGame, analyzeMove, calculateMaterialValue };
