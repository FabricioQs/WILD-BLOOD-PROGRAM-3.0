// Simple audio synthesizer for timer beeps
let audioCtx: AudioContext | null = null;

export const getAudioContext = () => {
  if (!audioCtx) {
    // Cross-browser support
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

// Función para desbloquear audio en iOS/Android al primer toque
export const unlockAudioContext = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume();
    }
};

export const playBeep = (frequency: number = 1000, duration: number = 0.15, type: OscillatorType = 'square') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Create nodes
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type; // 'square' is perceptually much louder than 'sine'
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Connect
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Volume Envelope (Higher gain for loudness)
    // 0.3 gain with square wave is VERY loud. 
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    // Play
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

// Sonido "3, 2, 1" -> Corto, agudo y penetrante
export const playCountDown = () => {
  playBeep(880, 0.15, 'square'); // Nota A5
};

// Sonido "GO!" -> Muy agudo y largo (tipo chicharra de gym)
export const playGoSound = () => {
  playBeep(1760, 0.8, 'square'); // Muy Agudo
  // Un segundo tono para darle "cuerpo" al sonido de salida
  setTimeout(() => playBeep(880, 0.8, 'square'), 50);
};

// Sonido "Rest" -> Tono más grave tipo "bajada"
export const playRestSound = () => {
    playBeep(440, 0.5, 'sawtooth'); // Nota A4
    setTimeout(() => playBeep(330, 0.5, 'sawtooth'), 100);
};