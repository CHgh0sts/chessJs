'use client';

interface ChessPieceProps {
  piece: string;
  size?: number | string;
}

export default function ChessPiece({ piece, size = '2.5rem' }: ChessPieceProps) {
  const getPieceSymbol = (piece: string) => {
    const pieces: { [key: string]: string } = {
      'K': '♔', // Roi blanc
      'Q': '♕', // Dame blanche
      'R': '♖', // Tour blanche
      'B': '♗', // Fou blanc
      'N': '♘', // Cavalier blanc
      'P': '♙', // Pion blanc
      'k': '♚', // Roi noir
      'q': '♛', // Dame noire
      'r': '♜', // Tour noire
      'b': '♝', // Fou noir
      'n': '♞', // Cavalier noir
      'p': '♟', // Pion noir
    };
    return pieces[piece] || '';
  };

  if (!piece) return null;

  const sizeStyle = typeof size === 'string' ? { fontSize: size } : { fontSize: `${size}px` };
  
  // Déterminer si c'est une pièce noire (minuscule) ou blanche (majuscule)
  const isBlackPiece = piece === piece.toLowerCase();
  
  return (
    <span 
      className={`chess-piece select-none cursor-grab active:cursor-grabbing flex items-center justify-center w-full h-full leading-none drop-shadow-lg ${
        isBlackPiece ? 'text-black' : 'text-white'
      }`}
      style={{
        ...sizeStyle,
        color: isBlackPiece ? '#000000' : '#ffffff',
        textShadow: isBlackPiece 
          ? '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 1px rgba(255,255,255,0.6)' // Ombre blanche pour pièces noires
          : '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.4)', // Ombre noire pour pièces blanches
        filter: 'contrast(1.3) brightness(1.1)',
        WebkitTextStroke: isBlackPiece ? '1px rgba(255,255,255,0.3)' : '1px rgba(0,0,0,0.3)'
      }}
    >
      {getPieceSymbol(piece)}
    </span>
  );
}
