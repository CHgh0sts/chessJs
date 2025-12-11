'use client';

import { useEffect } from 'react';

export default function SoundManager() {
  useEffect(() => {
    // Précharger les sons réels au chargement
    const initializeSounds = async () => {
      try {
        // Utiliser le fichier move.mp3 fourni et des variations simples
        const soundPaths = {
          '/sounds/move.mp3': '/sounds/move.mp3', // Son principal fourni
          '/sounds/capture.mp3': '/sounds/move.mp3', // Réutiliser pour capture
          '/sounds/check.mp3': '/sounds/move.mp3', // Réutiliser pour échec
          '/sounds/your-turn.mp3': '/sounds/move.mp3', // Réutiliser pour tour
          '/sounds/game-start.mp3': '/sounds/move.mp3', // Réutiliser pour début
          '/sounds/game-end.mp3': '/sounds/move.mp3' // Réutiliser pour fin
        };

        // Précharger tous les sons
        Object.entries(soundPaths).forEach(([virtualPath, realPath]) => {
          try {
            const audio = new Audio(realPath);
            audio.preload = 'auto';
            audio.volume = 0.5; // Volume par défaut
            
            // Stocker dans le cache global
            if (typeof window !== 'undefined') {
              const windowWithSounds = window as Window & { chessSounds?: Record<string, HTMLAudioElement> };
              windowWithSounds.chessSounds = windowWithSounds.chessSounds || {};
              windowWithSounds.chessSounds[virtualPath] = audio;
            }
          } catch (error) {
            console.warn(`Erreur lors du chargement du son ${realPath}:`, error);
          }
        });

        console.log('🔊 Sons d\'échecs initialisés avec move.mp3');
      } catch (error) {
        console.warn('Erreur lors de l\'initialisation des sons:', error);
      }
    };

    initializeSounds();
  }, []);

  return null; // Ce composant ne rend rien
}
