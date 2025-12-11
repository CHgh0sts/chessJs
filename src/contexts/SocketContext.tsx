'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { User } from '@/types';
import { getSocketDebugInfo } from '@/utils/debug';
import { useSound } from '@/hooks/useSound';

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
  moves: string[];
  isFriendlyGame?: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  gameState: GameState | null;
  waitingForOpponent: boolean;
  drawOffer: string | null;
  friendlyGameOffer: string | null;
  findGame: () => void;
  makeMove: (move: string) => void;
  leaveGame: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  resign: () => void;
  offerFriendlyGame: () => void;
  acceptFriendlyGame: () => void;
  declineFriendlyGame: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Fonctions de persistance de l'état de jeu
const saveGameState = (gameState: GameState | null) => {
  if (typeof window !== 'undefined') {
    if (gameState) {
      localStorage.setItem('chess_game_state', JSON.stringify(gameState));
    } else {
      localStorage.removeItem('chess_game_state');
    }
  }
};

const loadGameState = (): GameState | null => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('chess_game_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        localStorage.removeItem('chess_game_state');
        return null;
      }
    }
  }
  return null;
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(() => loadGameState());
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [drawOffer, setDrawOffer] = useState<string | null>(null);
  const [friendlyGameOffer, setFriendlyGameOffer] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Hook pour les sons
  const sounds = useSound();

  // Sauvegarder automatiquement l'état de jeu quand il change
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  // Vérifier périodiquement si on a un état sauvegardé sans être dans une partie
  useEffect(() => {
    const interval = setInterval(() => {
      const savedGame = loadGameState();
      if (savedGame && !gameState && connected) {
        console.log('🔍 État sauvegardé détecté sans partie active - tentative de nettoyage');
        // Si on a un état sauvegardé mais pas de partie active après 10 secondes
        setTimeout(() => {
          if (loadGameState() && !gameState) {
            console.log('🧹 Nettoyage automatique de l\'état orphelin');
            saveGameState(null);
          }
        }, 10000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [gameState, connected]);

  useEffect(() => {
    if (user) {
      console.log('👤 Utilisateur connecté, initialisation du socket pour:', user.username);
      getSocketDebugInfo();
      // Utiliser l'URL configurée, sinon l'URL actuelle en production, localhost en développement
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
        (process.env.NODE_ENV === 'production' 
          ? window.location.origin 
          : 'http://localhost:3000');
        
      console.log('🔗 Connexion Socket.IO vers:', socketUrl);
      
      const newSocket = io(socketUrl, {
        forceNew: true,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
      });
      
      newSocket.on('connect', () => {
        console.log('✅ Connecté au serveur Socket.IO');
        setConnected(true);
        newSocket.emit('userConnected', user);

        // Si on a une partie sauvegardée, tenter de la rejoindre
        const savedGame = loadGameState();
        if (savedGame) {
          console.log('🔄 Tentative de reconnexion à la partie:', savedGame.gameId);
          console.log('📝 État sauvegardé complet:', JSON.stringify(savedGame, null, 2));
          newSocket.emit('rejoinGame', { gameId: savedGame.gameId });
          
          // Timeout de sécurité - si pas de réponse en 5 secondes, nettoyer
          setTimeout(() => {
            console.log('⏰ Timeout de reconnexion - nettoyage de l\'état');
            if (loadGameState()?.gameId === savedGame.gameId) {
              setGameState(null);
              saveGameState(null);
            }
          }, 5000);
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Déconnecté du serveur Socket.IO. Raison:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('💥 Erreur de connexion Socket.IO:', error);
        console.error('🔗 URL tentée:', socketUrl);
        setConnected(false);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnexion réussie après', attemptNumber, 'tentatives');
        setConnected(true);
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Tentative de reconnexion #', attemptNumber);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('💥 Erreur de reconnexion:', error);
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
          status: 'active',
          moves: data.moves || [],
          isFriendlyGame: data.isFriendlyGame || false
        });
        
        // Son de début de partie
        sounds.playGameStartSound();
        
        // Son "votre tour" si c'est au joueur de commencer
        if (data.color === 'white') {
          setTimeout(() => sounds.playYourTurnSound(), 800);
        }
      });

      // Gérer la reconnexion à une partie existante
      newSocket.on('gameRejoined', (data) => {
        console.log('🔄 Partie rejointe avec succès:', data.gameId);
        setWaitingForOpponent(false);
        setGameState({
          gameId: data.gameId,
          color: data.color,
          opponent: data.opponent,
          fen: data.fen,
          currentPlayer: data.currentPlayer || 'white',
          timeLeft: data.timeLeft,
          status: data.status || 'active',
          moves: data.moves || [],
          isFriendlyGame: data.isFriendlyGame || false
        });
        
        // Son "votre tour" si c'est au joueur de jouer
        if ((data.currentPlayer || 'white') === data.color && (data.status || 'active') === 'active') {
          setTimeout(() => sounds.playYourTurnSound(), 500);
        }
      });

      newSocket.on('gameNotFound', (data) => {
        console.log('❌ Partie non trouvée:', data.gameId);
        console.log('🧹 Nettoyage de l\'état sauvegardé');
        // Nettoyer l'état sauvegardé car la partie n'existe plus
        setGameState(null);
        saveGameState(null);
      });

      newSocket.on('moveMade', (data) => {
        setGameState(prev => {
          if (!prev) return null;
          
          const newState = {
            ...prev,
            fen: data.fen,
            currentPlayer: data.currentPlayer,
            status: data.status,
            winner: data.winner,
            winReason: data.winReason,
            moves: data.moves || prev.moves
          };
          
          // Effets sonores pour les mouvements
          if (data.move) {
            // Vérifier si c'est une capture (le coup contient 'x')
            if (data.move.includes('x')) {
              sounds.playCaptureSound();
            } else {
              sounds.playMoveSound();
            }
            
            // Vérifier si c'est un échec (le coup se termine par '+')
            if (data.move.includes('+')) {
              setTimeout(() => sounds.playCheckSound(), 200);
            }
          }
          
          // Son "votre tour" si c'est maintenant au joueur de jouer
          if (data.currentPlayer === prev.color && data.status === 'active') {
            setTimeout(() => sounds.playYourTurnSound(), 300);
          }
          
          return newState;
        });
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
        
        // Son de fin de partie
        sounds.playGameEndSound();
        
        // Nettoyer automatiquement après 5 secondes
        setTimeout(() => {
          setGameState(null);
          saveGameState(null);
        }, 5000);
      });

      newSocket.on('error', (error) => {
        console.error('Erreur Socket:', error);
      });

      newSocket.on('drawOffered', (data) => {
        setDrawOffer(data.from);
        // Son de notification pour l'offre
        sounds.playYourTurnSound();
      });

      newSocket.on('drawOfferSent', () => {
        // Notification sera gérée par le composant
        console.log('Draw offer sent');
      });

      newSocket.on('drawDeclined', () => {
        // Notification sera gérée par le composant
        console.log('Draw offer declined');
      });

      newSocket.on('friendlyGameOffered', (data) => {
        setFriendlyGameOffer(data.from);
        // Son de notification pour l'offre
        sounds.playYourTurnSound();
      });

      newSocket.on('friendlyGameAccepted', () => {
        setGameState(prev => prev ? {
          ...prev,
          isFriendlyGame: true
        } : null);
        setFriendlyGameOffer(null);
        console.log('Friendly game mode activated - no timer!');
      });

      newSocket.on('friendlyGameDeclined', () => {
        setFriendlyGameOffer(null);
        console.log('Friendly game offer declined');
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
    
    // Nettoyer l'état si l'utilisateur se déconnecte
    return () => {
      setSocket(null);
      setConnected(false);
      setWaitingForOpponent(false);
      // Ne pas nettoyer gameState ici pour permettre la reconnexion
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (socket && gameState) {
      socket.emit('leaveGame', { gameId: gameState.gameId });
    }
    setGameState(null);
    setWaitingForOpponent(false);
    saveGameState(null); // Nettoyer le localStorage
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

  const offerFriendlyGame = () => {
    console.log('offerFriendlyGame called', { socket: !!socket, gameState: !!gameState });
    if (socket && gameState) {
      socket.emit('offerFriendlyGame', { gameId: gameState.gameId });
      console.log('Friendly game offer sent');
    }
  };

  const acceptFriendlyGame = () => {
    if (socket && gameState) {
      socket.emit('acceptFriendlyGame', { gameId: gameState.gameId });
      setFriendlyGameOffer(null);
    }
  };

  const declineFriendlyGame = () => {
    if (socket && gameState) {
      socket.emit('declineFriendlyGame', { gameId: gameState.gameId });
      setFriendlyGameOffer(null);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      gameState,
      waitingForOpponent,
      drawOffer,
      friendlyGameOffer,
      findGame,
      makeMove,
      leaveGame,
      offerDraw,
      acceptDraw,
      declineDraw,
      resign,
      offerFriendlyGame,
      acceptFriendlyGame,
      declineFriendlyGame
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
