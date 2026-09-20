/**
 * Synthetic audio effects using the Web Audio API for typing feedback.
 * No external mp3/wav files required, zero latency, runs offline.
 */
import { SoundType } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playKeySound(type: SoundType, volume: number = 0.5): void {
  if (type === 'off' || volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * 0.15, now);
  gainNode.connect(ctx.destination);

  if (type === 'typewriter') {
    // Typewriter: metallic clack + slight resonant ring
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const baseFreq = 800 + (Math.random() * 200 - 100);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1800;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(gainNode);

    osc.connect(gainNode);

    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.start(now);
    noiseSource.start(now);
    osc.stop(now + 0.06);
    noiseSource.stop(now + 0.04);

  } else if (type === 'mechanical') {
    // Mechanical click: crisp attack + sharp snap
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const pitch = 1400 + (Math.random() * 300 - 150);
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.025);

    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.03);

  } else if (type === 'soft') {
    // Soft low thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export function playCompletionSound(volume: number = 0.5): void {
  const ctx = getAudioContext();
  if (!ctx || volume <= 0) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord arpeggio
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0, now + idx * 0.08);
    gain.gain.linearRampToValueAtTime(volume * 0.2, now + idx * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.36);
  });
}
