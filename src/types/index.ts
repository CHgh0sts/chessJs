export interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameState {
  id: string;
  board: string;
  currentPlayer: 'white' | 'black';
  players: {
    white: User;
    black: User;
  };
  timeLeft: {
    white: number;
    black: number;
  };
  status: 'waiting' | 'active' | 'finished';
  winner?: 'white' | 'black' | 'draw';
  moves: string[];
  createdAt: Date;
}

export interface GameRoom {
  id: string;
  players: string[];
  gameState?: GameState;
  spectators: string[];
}

export interface SocketUser {
  id: string;
  socketId: string;
  user: User;
}
