'use client';

import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/hooks/useDialog';
import ChessBoard from '../chess/ChessBoard';
import Dialog from '../ui/Dialog';
import ChessPiece from '../chess/ChessPiece';

export default function GameRoom() {
  const { gameState, makeMove, offerDraw, resign, drawOffer, acceptDraw, declineDraw, friendlyGameOffer, offerFriendlyGame, acceptFriendlyGame, declineFriendlyGame } = useSocket();
  const { user } = useAuth();
  const { isOpen, dialogOptions, onConfirm, showDialog, hideDialog } = useDialog();

  // Fonction pour analyser un coup et extraire la pièce qui a bougé
  const parseMoveNotation = (move: string, isWhiteMove: boolean) => {
    // Retirer les annotations (+, #, !, ?, etc.)
    const cleanMove = move.replace(/[+#!?]/g, '');
    
    // Déterminer la couleur de la pièce
    const pieceColor = isWhiteMove ? 'white' : 'black';
    
    // Cas spéciaux
    if (cleanMove === 'O-O' || cleanMove === 'O-O-O') {
      return {
        piece: isWhiteMove ? 'K' : 'k',
        pieceColor,
        destination: cleanMove === 'O-O' ? (isWhiteMove ? 'g1' : 'g8') : (isWhiteMove ? 'c1' : 'c8'),
        moveType: 'castling'
      };
    }
    
    // Extraire la case de destination (toujours les 2 derniers caractères)
    const destination = cleanMove.slice(-2);
    
    // Déterminer la pièce qui a bougé
    let piece = 'P'; // Par défaut, c'est un pion
    
    if (/^[KQRBN]/.test(cleanMove)) {
      // Le coup commence par une lettre majuscule = pièce spécifique
      piece = cleanMove[0];
    }
    
    // Ajuster la casse selon la couleur
    const finalPiece = isWhiteMove ? piece : piece.toLowerCase();
    
    return {
      piece: finalPiece,
      pieceColor,
      destination,
      moveType: 'normal'
    };
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Aucune partie en cours</h2>
          <p className="text-gray-600 mb-6">Trouvez un adversaire pour commencer à jouer</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
          >
            🎯 Nouvelle partie
          </button>
        </div>
      </div>
    );
  }

  const handleMove = (move: string) => {
    makeMove(move);
  };

  const getGameStatusMessage = () => {
    if (gameState.status === 'finished') {
      if (gameState.winner === 'draw') {
        return 'Partie nulle !';
      } else if (gameState.winner === gameState.color) {
        return '🎉 Vous avez gagné !';
      } else {
        return '😔 Vous avez perdu';
      }
    }
    return null;
  };

  const getWinReasonMessage = () => {
    if (gameState.status === 'finished' && gameState.winReason) {
      switch (gameState.winReason) {
        case 'checkmate':
          return 'Par échec et mat';
        case 'timeout':
          return 'Par temps dépassé';
        case 'disconnect':
          return 'Par déconnexion de l\'adversaire';
        case 'resignation':
          return 'Par abandon';
        case 'agreement':
          return 'Par accord mutuel';
        default:
          return '';
      }
    }
    return '';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Offre de partie nulle */}
        {drawOffer && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 text-center">
            <div className="font-bold">Offre de partie nulle</div>
            <div className="text-sm mb-2">{drawOffer} vous propose une partie nulle</div>
            <div className="space-x-2">
              <button
                onClick={acceptDraw}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Accepter
              </button>
              <button
                onClick={declineDraw}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Refuser
              </button>
            </div>
          </div>
        )}
        
        {/* Offre de partie amicale */}
        {friendlyGameOffer && (
          <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded mb-4 text-center">
            <div className="font-bold">🤝 Offre de partie amicale</div>
            <div className="text-sm mb-2">{friendlyGameOffer} vous propose de jouer sans timer</div>
            <div className="space-x-2">
              <button
                onClick={acceptFriendlyGame}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Accepter
              </button>
              <button
                onClick={declineFriendlyGame}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Refuser
              </button>
            </div>
          </div>
        )}
        
        {/* Messages de statut */}
        {getGameStatusMessage() && (
          <div className={`mb-6 p-4 rounded-lg text-center ${
            gameState.winner === gameState.color 
              ? 'bg-green-100 text-green-800' 
              : gameState.winner === 'draw'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <div className="text-xl font-bold">{getGameStatusMessage()}</div>
            <div className="text-sm mt-1">{getWinReasonMessage()}</div>
          </div>
        )}

        {/* Zone de jeu */}
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Zone plateau avec timers */}
          <div className="flex flex-col items-center space-y-3">
            {/* Timer adversaire (au-dessus) */}
            <div className="bg-gray-700 rounded-lg shadow-lg px-3 py-2 w-full max-w-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    gameState.currentPlayer !== gameState.color ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <div>
                    <div className="font-bold text-white text-sm">{gameState.opponent.username}</div>
                    <div className="text-xs text-gray-200">Rating: {gameState.opponent.rating}</div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded font-mono text-sm font-bold border ${
                  gameState.isFriendlyGame
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : gameState.currentPlayer !== gameState.color
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                } ${
                  !gameState.isFriendlyGame && gameState.timeLeft[gameState.color === 'white' ? 'black' : 'white'] <= 30000
                    ? 'text-red-600 bg-red-100 border-red-500'
                    : ''
                }`}>
                  {gameState.isFriendlyGame ? '∞' : (
                    <>
                      {Math.floor(gameState.timeLeft[gameState.color === 'white' ? 'black' : 'white'] / 60000)}:
                      {Math.floor((gameState.timeLeft[gameState.color === 'white' ? 'black' : 'white'] % 60000) / 1000)
                        .toString().padStart(2, '0')}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Plateau d'échecs */}
            <div className="flex-shrink-0">
              <ChessBoard
                fen={gameState.fen}
                playerColor={gameState.color}
                currentPlayer={gameState.currentPlayer}
                onMove={handleMove}
                disabled={gameState.status === 'finished'}
              />
            </div>

            {/* Timer joueur (en dessous) */}
            <div className="bg-gray-700 rounded-lg shadow-lg px-3 py-2 w-full max-w-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    gameState.currentPlayer === gameState.color ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <div>
                    <div className="font-bold text-white text-sm">Vous</div>
                    <div className="text-xs text-gray-200">
                      Rating: {user?.rating} • {gameState.color === 'white' ? 'Blancs' : 'Noirs'}
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded font-mono text-sm font-bold border ${
                  gameState.isFriendlyGame
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : gameState.currentPlayer === gameState.color
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                } ${
                  !gameState.isFriendlyGame && gameState.timeLeft[gameState.color] <= 30000
                    ? 'text-red-600 bg-red-100 border-red-500'
                    : ''
                }`}>
                  {gameState.isFriendlyGame ? '∞' : (
                    <>
                      {Math.floor(gameState.timeLeft[gameState.color] / 60000)}:
                      {Math.floor((gameState.timeLeft[gameState.color] % 60000) / 1000)
                        .toString().padStart(2, '0')}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panneau latéral */}
          <div className="flex flex-col space-y-6 w-80 flex-shrink-0">

            {/* Informations de partie */}
            <div className="bg-gray-700 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Informations</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-200">Votre couleur:</span> 
                  <span className={`ml-2 px-2 py-1 rounded ${
                    gameState.color === 'white' ? 'bg-gray-100 text-gray-800' : 'bg-gray-800 text-white'
                  }`}>
                    {gameState.color === 'white' ? 'Blanc' : 'Noir'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-300">Tour actuel:</span> 
                  <span className={`ml-2 px-2 py-1 rounded ${
                    gameState.currentPlayer === 'white' ? 'bg-gray-100 text-gray-800' : 'bg-gray-800 text-white'
                  }`}>
                    {gameState.currentPlayer === 'white' ? 'Blanc' : 'Noir'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-300">Statut:</span> 
                  <span className={`ml-2 px-2 py-1 rounded ${
                    gameState.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {gameState.status === 'active' ? 'En cours' : 'Terminée'}
                  </span>
                </div>
                
                {/* Indicateur partie amicale */}
                {gameState.isFriendlyGame && (
                  <div>
                    <span className="font-semibold text-gray-300">Mode:</span> 
                    <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-800">
                      🤝 Partie amicale (sans timer)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {gameState.status !== 'finished' && (
              <div className="bg-gray-700 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Actions</h3>
                <div className="space-y-2">
                  <button
                    className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => {
                      showDialog({
                        title: 'Proposer une partie nulle',
                        message: 'Êtes-vous sûr de vouloir proposer une partie nulle à votre adversaire ?',
                        confirmText: 'Proposer',
                        cancelText: 'Annuler',
                        type: 'warning'
                      }, () => {
                        offerDraw();
                      });
                    }}
                  >
                    Proposer partie nulle
                  </button>
                  
                  {/* Bouton partie amicale - seulement si ce n'est pas déjà une partie amicale */}
                  {!gameState.isFriendlyGame && (
                    <button
                      className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                      onClick={() => {
                        showDialog({
                          title: '🤝 Proposer une partie amicale',
                          message: 'Voulez-vous proposer de jouer sans timer ? Si votre adversaire accepte, le temps ne sera plus limité.',
                          confirmText: 'Proposer',
                          cancelText: 'Annuler',
                          type: 'info'
                        }, () => {
                          offerFriendlyGame();
                        });
                      }}
                    >
                      🤝 Partie amicale
                    </button>
                  )}
                  
                  <button
                    className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => {
                      showDialog({
                        title: 'Abandonner la partie',
                        message: 'Êtes-vous sûr de vouloir abandonner ? Vous perdrez automatiquement la partie et votre adversaire sera déclaré vainqueur.',
                        confirmText: 'Abandonner',
                        cancelText: 'Continuer',
                        type: 'error'
                      }, () => {
                        resign();
                      });
                    }}
                  >
                    Abandonner
                  </button>
                </div>
              </div>
            )}

            {/* Historique des coups */}
            <div className="bg-gray-700 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Historique des coups</h3>
              <div className="max-h-64 overflow-y-auto">
                {gameState.moves && gameState.moves.length > 0 ? (
                  <div className="space-y-2">
                    {gameState.moves.slice().reverse().map((move, reverseIndex) => {
                      const index = gameState.moves.length - 1 - reverseIndex;
                      const moveNumber = Math.floor(index / 2) + 1;
                      const isWhiteMove = index % 2 === 0;
                      const moveInfo = parseMoveNotation(move, isWhiteMove);
                      
                      return (
                        <div key={`move-${index}`} className="flex items-center">
                          {/* Numéro du coup */}
                          {isWhiteMove && (
                            <span className="text-gray-300 font-bold text-sm w-8 text-right mr-3">
                              {moveNumber}.
                            </span>
                          )}
                          {!isWhiteMove && <span className="w-11"></span>}
                          
                          {/* Conteneur du coup */}
                          <div className={`flex items-center gap-2 px-2 py-1 rounded min-w-0 flex-1 ${
                            isWhiteMove 
                              ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                              : 'bg-gray-900 text-white border border-gray-500'
                          }`}>
                            {/* Icône de la pièce avec fond contrasté */}
                            <div className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 overflow-visible ${
                              isWhiteMove 
                                ? 'bg-gray-800' 
                                : 'bg-gray-100'
                            }`}>
                              <span 
                                className="leading-none"
                                style={{
                                  fontSize: '2rem',
                                  color: isWhiteMove ? '#ffffff' : '#000000',
                                  textShadow: isWhiteMove 
                                    ? '0 0 5px rgba(0,0,0,1), 2px 2px 4px rgba(0,0,0,1)' 
                                    : '0 0 5px rgba(255,255,255,1), 2px 2px 4px rgba(255,255,255,1)',
                                  filter: 'contrast(1.8) brightness(1.4)',
                                  WebkitTextStroke: isWhiteMove ? '1px rgba(0,0,0,0.5)' : '1px rgba(255,255,255,0.5)',
                                  transform: 'scale(1.1)'
                                }}
                              >
                                {(() => {
                                  const pieces = {
                                    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
                                    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
                                  };
                                  return pieces[moveInfo.piece] || '';
                                })()}
                              </span>
                            </div>
                            
                            {/* Texte du mouvement */}
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-xs opacity-60">→</span>
                              <span className={`font-mono font-bold text-sm px-1 py-0.5 rounded ${
                                isWhiteMove 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-blue-800 text-blue-200'
                              }`}>
                                {moveInfo.destination.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm italic text-center py-8">
                    <div className="text-4xl mb-2">♔</div>
                    <div>Aucun coup joué pour le moment</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={hideDialog}
        title={dialogOptions.title}
        message={dialogOptions.message}
        confirmText={dialogOptions.confirmText}
        cancelText={dialogOptions.cancelText}
        type={dialogOptions.type}
        onConfirm={onConfirm}
      />
    </div>
  );
}
