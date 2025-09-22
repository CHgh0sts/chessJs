'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { User } from '@/types';

interface GameState {
  gameId: string;
  color: 'white' | 'black';
  opponent: User;
  fen: string;
  currentPlayer: 'white' | 'black';
  timeLeft: {
    white: number;
    black: number;
  };
  status: 'waiting' | 'active' | 'finished';
  winner?: 'white' | 'black' | 'draw';
  winReason?: string;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  gameState: GameState | null;
  waitingForOpponent: boolean;
  drawOffer: string | null;
  findGame: () => void;
  makeMove: (move: string) => void;
  leaveGame: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  resign: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [drawOffer, setDrawOffer] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('👤 Utilisateur connecté, initialisation du socket pour:', user.username);
      const newSocket = io('http://localhost:3000', {
        forceNew: true,
        timeout: 5000,
      });
      
      newSocket.on('connect', () => {
        console.log('✅ Connecté au serveur Socket.IO');
        setConnected(true);
        newSocket.emit('userConnected', user);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Déconnecté du serveur Socket.IO. Raison:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('💥 Erreur de connexion Socket.IO:', error);
        setConnected(false);
      });

      newSocket.on('waitingForOpponent', () => {
        setWaitingForOpponent(true);
      });

      newSocket.on('gameFound', (data) => {
        setWaitingForOpponent(false);
        setGameState({
          gameId: data.gameId,
          color: data.color,
          opponent: data.opponent,
          fen: data.fen,
          currentPlayer: 'white',
          timeLeft: data.timeLeft,
          status: 'active'
        });
      });

      newSocket.on('moveMade', (data) => {
        setGameState(prev => prev ? {
          ...prev,
          fen: data.fen,
          currentPlayer: data.currentPlayer,
          status: data.status,
          winner: data.winner,
          winReason: data.winReason
        } : null);
      });

      newSocket.on('timeUpdate', (timeLeft) => {
        setGameState(prev => prev ? {
          ...prev,
          timeLeft
        } : null);
      });

      newSocket.on('gameOver', (data) => {
        setGameState(prev => prev ? {
          ...prev,
          status: 'finished',
          winner: data.winner,
          winReason: data.reason
        } : null);
      });

      newSocket.on('error', (error) => {
        console.error('Erreur Socket:', error);
      });

      newSocket.on('drawOffered', (data) => {
        setDrawOffer(data.from);
      });

      newSocket.on('drawOfferSent', () => {
        // Notification sera gérée par le composant
        console.log('Draw offer sent');
      });

      newSocket.on('drawDeclined', () => {
        // Notification sera gérée par le composant
        console.log('Draw offer declined');
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const findGame = () => {
    if (socket) {
      socket.emit('findGame');
    }
  };

  const makeMove = (move: string) => {
    if (socket && gameState) {
      socket.emit('makeMove', {
        gameId: gameState.gameId,
        move
      });
    }
  };

  const leaveGame = () => {
    setGameState(null);
    setWaitingForOpponent(false);
  };

  const offerDraw = () => {
    console.log('offerDraw called', { socket: !!socket, gameState: !!gameState });
    if (socket && gameState) {
      socket.emit('offerDraw', { gameId: gameState.gameId });
      console.log('Draw offer sent');
    }
  };

  const acceptDraw = () => {
    if (socket && gameState) {
      socket.emit('acceptDraw', { gameId: gameState.gameId });
      setDrawOffer(null);
    }
  };

  const declineDraw = () => {
    if (socket && gameState) {
      socket.emit('declineDraw', { gameId: gameState.gameId });
      setDrawOffer(null);
    }
  };

  const resign = () => {
    console.log('resign called', { socket: !!socket, gameState: !!gameState });
    if (socket && gameState) {
      socket.emit('resign', { gameId: gameState.gameId });
      console.log('Resignation sent');
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      gameState,
      waitingForOpponent,
      drawOffer,
      findGame,
      makeMove,
      leaveGame,
      offerDraw,
      acceptDraw,
      declineDraw,
      resign
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
