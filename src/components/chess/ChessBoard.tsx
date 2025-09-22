'use client';

import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessPiece from './ChessPiece';

interface ChessBoardProps {
  fen: string;
  playerColor: 'white' | 'black';
  currentPlayer: 'white' | 'black';
  onMove: (move: string) => void;
  disabled?: boolean;
}

interface Square {
  piece: string | null;
  file: string;
  rank: string;
  square: string;
}

export default function ChessBoard({ fen, playerColor, currentPlayer, onMove, disabled }: ChessBoardProps) {
  const [chess] = useState(new Chess());
  const [board, setBoard] = useState<Square[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<string[]>([]);

  const convertPieceNotation = useCallback((chessPiece: { type: string; color: string } | null) => {
    if (!chessPiece) return '';
    
    // chess.js renvoie un objet avec type et color
    const { type, color } = chessPiece;
    const pieceChar = type.toUpperCase();
    
    // Retourner majuscule pour blanc, minuscule pour noir
    return color === 'w' ? pieceChar : pieceChar.toLowerCase();
  }, []);

  useEffect(() => {
    const updateBoard = () => {
      const boardArray: Square[][] = [];
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = playerColor === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];

      for (const rank of ranks) {
        const row: Square[] = [];
        for (const file of files) {
          const square = `${file}${rank}`;
          const piece = chess.get(square as 'a1');
          row.push({
            piece: piece ? convertPieceNotation(piece) : null,
            file,
            rank,
            square
          });
        }
        boardArray.push(row);
      }
      setBoard(boardArray);
    };

    chess.load(fen);
    updateBoard();
  }, [fen, chess, convertPieceNotation, playerColor]);

  const handleSquareClick = (square: string) => {
    if (disabled || currentPlayer !== playerColor) return;

    if (selectedSquare === square) {
      // Déselectionner si on clique sur la même case
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    if (selectedSquare && possibleMoves.includes(square)) {
      // Effectuer le mouvement
      try {
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q' // Toujours promouvoir en dame pour simplifier
        });
        
        if (move) {
          onMove(`${selectedSquare}${square}`);
          setLastMove([selectedSquare, square]);
        }
      } catch (error) {
        console.error('Mouvement invalide:', error);
      }
      
      setSelectedSquare(null);
      setPossibleMoves([]);
    } else {
      // Sélectionner une nouvelle case
      const piece = chess.get(square as 'a1');
      if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
        setSelectedSquare(square);
        const moves = chess.moves({ square: square as 'a1', verbose: true });
        setPossibleMoves(moves.map(move => move.to));
      } else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  const getSquareColor = (file: string, rank: string) => {
    const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
    const rankIndex = parseInt(rank) - 1;
    return (fileIndex + rankIndex) % 2 === 0 ? 'bg-amber-200' : 'bg-amber-900';
  };

  const getSquareHighlight = (square: string) => {
    if (selectedSquare === square) return 'ring-4 ring-blue-500 ring-inset';
    if (possibleMoves.includes(square)) return 'ring-4 ring-green-400 ring-inset';
    if (lastMove.includes(square)) return 'ring-2 ring-yellow-400 ring-inset';
    return '';
  };

  return (
    <div className="chess-board flex justify-center">
      <div className="grid grid-cols-8 border-2 border-gray-800 w-[min(85vw,85vh,500px)] aspect-square">
        {board.map((row, rowIndex) =>
          row.map((square, colIndex) => (
            <div
              key={square.square}
              className={`
                ${getSquareColor(square.file, square.rank)}
                ${getSquareHighlight(square.square)}
                flex items-center justify-center relative cursor-pointer
                hover:brightness-110 transition-all duration-150
                aspect-square w-full h-full
                ${disabled || currentPlayer !== playerColor ? 'cursor-not-allowed opacity-75' : ''}
              `}
              onClick={() => handleSquareClick(square.square)}
            >
              {/* Coordonnées */}
              {colIndex === 0 && (
                <div className="absolute left-1 top-1 text-xs sm:text-sm font-bold text-gray-700 drop-shadow-sm">
                  {square.rank}
                </div>
              )}
              {rowIndex === board.length - 1 && (
                <div className="absolute right-1 bottom-1 text-xs sm:text-sm font-bold text-gray-700 drop-shadow-sm">
                  {square.file}
                </div>
              )}
              
              {/* Pièce */}
              {square.piece && (
                <ChessPiece 
                  piece={square.piece} 
                  size="3.5rem"
                />
              )}
              
              {/* Indicateur de mouvement possible */}
              {possibleMoves.includes(square.square) && !square.piece && (
                <div className="w-4 h-4 bg-green-500 rounded-full opacity-70"></div>
              )}
              
              {/* Indicateur de capture possible */}
              {possibleMoves.includes(square.square) && square.piece && (
                <div className="absolute inset-1 border-4 border-red-500 rounded-full opacity-70"></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
