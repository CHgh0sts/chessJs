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

  return (
    <span 
      className={`chess-piece select-none cursor-grab active:cursor-grabbing flex items-center justify-center w-full h-full leading-none drop-shadow-lg`}
      style={{
        ...sizeStyle,
        textShadow: '2px 2px 4px rgba(0,0,0,0.5), -1px -1px 2px rgba(255,255,255,0.8)',
        filter: 'contrast(1.2) brightness(1.1)'
      }}
    >
      {getPieceSymbol(piece)}
    </span>
  );
}
