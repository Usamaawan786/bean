// Phone-style ringtone for new delivery orders. Repeats until the order is accepted or rejected.
let ctx = null;

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// One bright, bell-like tone: a triangle wave plus a quieter octave-up sine, quick attack, short decay
function tone(c, freq, start, dur, vol) {
  const t = c.currentTime + start;
  const gain = c.createGain();
  gain.connect(c.destination);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const a = c.createOscillator();
  a.type = "triangle";
  a.frequency.value = freq;
  a.connect(gain);
  a.start(t);
  a.stop(t + dur + 0.05);

  const b = c.createOscillator();
  const g2 = c.createGain();
  g2.gain.value = 0.35;
  b.type = "sine";
  b.frequency.value = freq * 2;
  b.connect(g2);
  g2.connect(gain);
  b.start(t);
  b.stop(t + dur + 0.05);
}

// A rising 8-note melody played twice, then a short pause before the loop repeats (about 3 seconds per ring)
const MELODY = [784, 988, 1175, 1568, 1175, 988, 1175, 1568]; // G5 B5 D6 G6 D6 B5 D6 G6
export function playDeliveryChime() {
  try {
    const c = getCtx();
    if (!c) return;
    const step = 0.13;
    for (let rep = 0; rep < 2; rep++) {
      MELODY.forEach((f, i) => tone(c, f, rep * (MELODY.length * step + 0.12) + i * step, 0.28, 0.5));
    }
  } catch (e) { /* sound is a nicety */ }
}

// Browsers only allow sound after a user gesture; unlock on the first tap/click anywhere in the POS
export function unlockDeliveryChime() {
  try { getCtx(); } catch (e) { /* ignore */ }
}

// Starts the repeating ringtone; returns a stop function
export function startDeliveryChimeLoop(intervalMs = 3200) {
  playDeliveryChime();
  const id = setInterval(playDeliveryChime, intervalMs);
  return () => clearInterval(id);
}
