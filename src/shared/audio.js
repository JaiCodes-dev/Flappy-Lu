let context;

function getContext() {
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    context = AudioContext ? new AudioContext() : null;
  }

  if (context?.state === 'suspended') {
    context.resume();
  }

  return context;
}

function tone({ frequency, duration = 0.1, type = 'sine', gain = 0.06, bend = 0 }) {
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  const now = ctx.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (bend) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + bend), now + duration);
  }

  volume.gain.setValueAtTime(gain, now);
  volume.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(volume);
  volume.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

export const audio = {
  unlock() {
    getContext();
  },
  flap() {
    tone({ frequency: 520, duration: 0.09, type: 'triangle', gain: 0.045, bend: 210 });
  },
  score() {
    tone({ frequency: 820, duration: 0.08, type: 'sine', gain: 0.045, bend: 170 });
    window.setTimeout(() => tone({ frequency: 1120, duration: 0.08, type: 'sine', gain: 0.035, bend: 130 }), 55);
  },
  hit() {
    tone({ frequency: 130, duration: 0.18, type: 'sawtooth', gain: 0.05, bend: -70 });
  },
  click() {
    tone({ frequency: 420, duration: 0.045, type: 'square', gain: 0.025, bend: 80 });
  }
};
