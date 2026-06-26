import { useCallback, useRef } from "react";

type SoundType = "success" | "alert";

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSuccess = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, t + 0.2); // G5
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  };

  const playAlert = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(440, t); // A4
    osc.frequency.setValueAtTime(440, t + 0.1);
    osc.frequency.setValueAtTime(0, t + 0.15); // pause
    osc.frequency.setValueAtTime(440, t + 0.2); // A4 again
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.setValueAtTime(0.2, t + 0.1);
    gain.gain.setValueAtTime(0, t + 0.15);
    gain.gain.setValueAtTime(0.2, t + 0.2);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  };

  const play = useCallback((type: SoundType) => {
    try {
      if (type === "success") {
        playSuccess();
      } else if (type === "alert") {
        playAlert();
      }
    } catch (err) {
      console.warn("Audio playback failed:", err);
    }
  }, []);

  return { play };
}
