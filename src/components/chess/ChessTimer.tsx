'use client';

interface ChessTimerProps {
  timeLeft: {
    white: number;
    black: number;
  };
  currentPlayer: 'white' | 'black';
  playerColor: 'white' | 'black';
}

export default function ChessTimer({ timeLeft, currentPlayer, playerColor }: ChessTimerProps) {
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerClass = (color: 'white' | 'black') => {
    let baseClass = "px-4 py-2 rounded-lg font-mono text-lg font-bold border-2 ";
    
    if (currentPlayer === color) {
      baseClass += "bg-green-100 border-green-500 text-green-800 animate-pulse ";
    } else {
      baseClass += "bg-gray-100 border-gray-300 text-gray-600 ";
    }
    
    // Avertissement si moins de 30 secondes
    if (timeLeft[color] <= 30000) {
      baseClass += "text-red-600 bg-red-100 border-red-500 ";
    }
    
    return baseClass;
  };

  return (
    <div className="flex flex-col space-y-4 w-32">
      {/* Timer de l'adversaire (en haut) */}
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-1">
          {playerColor === 'white' ? 'Noir' : 'Blanc'}
        </div>
        <div className={getTimerClass(playerColor === 'white' ? 'black' : 'white')}>
          {formatTime(timeLeft[playerColor === 'white' ? 'black' : 'white'])}
        </div>
      </div>
      
      {/* Timer du joueur (en bas) */}
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-1">Vous</div>
        <div className={getTimerClass(playerColor)}>
          {formatTime(timeLeft[playerColor])}
        </div>
      </div>
    </div>
  );
}
