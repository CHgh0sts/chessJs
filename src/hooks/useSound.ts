import { useCallback, useRef, useMemo } from 'react';

interface SoundOptions {
  volume?: number;
  playbackRate?: number;
}

export function useSound() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  const playSound = useCallback((soundPath: string, options: SoundOptions = {}) => {
    try {
      // Vérifier d'abord le cache global
      let audio: HTMLAudioElement | null = null;
      if (typeof window !== 'undefined') {
        const windowWithSounds = window as Window & { chessSounds?: Record<string, HTMLAudioElement> };
        if (windowWithSounds.chessSounds && windowWithSounds.chessSounds[soundPath]) {
          audio = windowWithSounds.chessSounds[soundPath];
        }
      }
      
      if (!audio) {
        // Vérifier le cache local
        audio = audioCache.current.get(soundPath) || null;
        
        if (!audio) {
          // Créer un nouveau élément audio et le mettre en cache
          audio = new Audio(soundPath);
          audio.preload = 'auto';
          audioCache.current.set(soundPath, audio);
        }
      }

      // Configurer les options
      if (options.volume !== undefined) {
        audio.volume = Math.max(0, Math.min(1, options.volume));
      }
      if (options.playbackRate !== undefined) {
        audio.playbackRate = options.playbackRate;
      }

      // Remettre le son au début et le jouer
      audio.currentTime = 0;
      const playPromise = audio.play();

      // Gérer les erreurs de lecture
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Erreur lors de la lecture du son:', error);
        });
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du son:', error);
    }
  }, []);

  // Sons prédéfinis pour le jeu d'échecs
  const playMoveSound = useCallback(() => {
    playSound('/sounds/move.mp3', { volume: 0.6 });
  }, [playSound]);

  const playCaptureSound = useCallback(() => {
    playSound('/sounds/capture.mp3', { volume: 0.7 });
  }, [playSound]);

  const playCheckSound = useCallback(() => {
    playSound('/sounds/check.mp3', { volume: 0.8 });
  }, [playSound]);

  const playYourTurnSound = useCallback(() => {
    playSound('/sounds/your-turn.mp3', { volume: 0.5 });
  }, [playSound]);

  const playGameStartSound = useCallback(() => {
    playSound('/sounds/game-start.mp3', { volume: 0.6 });
  }, [playSound]);

  const playGameEndSound = useCallback(() => {
    playSound('/sounds/game-end.mp3', { volume: 0.7 });
  }, [playSound]);

  return useMemo(() => ({
    playSound,
    playMoveSound,
    playCaptureSound,
    playCheckSound,
    playYourTurnSound,
    playGameStartSound,
    playGameEndSound
  }), [playSound, playMoveSound, playCaptureSound, playCheckSound, playYourTurnSound, playGameStartSound, playGameEndSound]);
}
