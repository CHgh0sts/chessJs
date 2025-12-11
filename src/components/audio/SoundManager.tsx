'use client';

import { useEffect } from 'react';
import { generateTone, generateChord } from '@/utils/generateSounds';

export default function SoundManager() {
  useEffect(() => {
    // Générer et sauvegarder les sons au chargement
    const initializeSounds = async () => {
      try {
        // Son de mouvement simple (note douce)
        const moveSound = generateTone(440, 0.15, 0.3); // La4, 150ms
        
        // Son de capture (note plus grave et forte)
        const captureSound = generateTone(220, 0.25, 0.4); // La3, 250ms
        
        // Son d'échec (accord dissonant)
        const checkSound = generateChord([523, 659, 784], 0.3, 0.35); // Do-Mi-Sol, 300ms
        
        // Son "votre tour" (mélodie montante)
        const yourTurnSound = generateChord([349, 392, 440], 0.4, 0.25); // Fa-Sol-La, 400ms
        
        // Son début de partie (accord majeur)
        const gameStartSound = generateChord([261, 329, 392], 0.5, 0.3); // Do-Mi-Sol, 500ms
        
        // Son fin de partie (séquence descendante)
        const gameEndSound = generateChord([523, 440, 349, 293], 0.6, 0.35); // Do-La-Fa-Ré, 600ms

        // Créer des éléments audio et les précharger
        const sounds = {
          '/sounds/move.mp3': moveSound,
          '/sounds/capture.mp3': captureSound,
          '/sounds/check.mp3': checkSound,
          '/sounds/your-turn.mp3': yourTurnSound,
          '/sounds/game-start.mp3': gameStartSound,
          '/sounds/game-end.mp3': gameEndSound
        };

        // Précharger tous les sons
        Object.entries(sounds).forEach(([path, url]) => {
          const audio = new Audio(url);
          audio.preload = 'auto';
          // Stocker dans le cache global si nécessaire
          if (typeof window !== 'undefined') {
            const windowWithSounds = window as Window & { chessSounds?: Record<string, HTMLAudioElement> };
            windowWithSounds.chessSounds = windowWithSounds.chessSounds || {};
            windowWithSounds.chessSounds[path] = audio;
          }
        });

        console.log('🔊 Sons d\'échecs initialisés');
      } catch (error) {
        console.warn('Erreur lors de l\'initialisation des sons:', error);
      }
    };

    initializeSounds();
  }, []);

  return null; // Ce composant ne rend rien
}
