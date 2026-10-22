// Alerts for station screens (KDS / Bar). Generated with the Web Audio API so
// there is no audio asset to load and it still works offline in the Android app.

let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
  }
  return ctx;
}

function tone(c, freq, at, dur, peak = 0.35, type = "sine") {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

export function audioReady() {
  return !!ctx && ctx.state === "running";
}

// Browsers keep audio locked until the page has been touched at least once.
// Call this on mount and on the first tap/keypress so later alerts can play.
export function primeAudio() {
  const c = getCtx();
  if (!c) return false;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (c.state === "running") {
    // Silent blip — confirms playback is actually permitted.
    try {
      tone(c, 440, c.currentTime, 0.01, 0.0001);
    } catch (e) {}
  }
  return c.state === "running";
}

// Two rising triplets: loud enough to carry across the kitchen, short enough
// not to nag when several tickets land together.
export function playNewOrderChime() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t = c.currentTime + 0.02;
  [0, 1].forEach(rep => {
    const b = t + rep * 0.62;
    tone(c, 784, b, 0.14);
    tone(c, 1047, b + 0.16, 0.14);
    tone(c, 1319, b + 0.32, 0.26, 0.4);
  });
}