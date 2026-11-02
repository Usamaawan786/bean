// Soft, slow two-note chime for new delivery orders. Repeats until the order is accepted or rejected.
let ctx = null;

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function note(c, freq, start, dur, vol) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);
  const t = c.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function playDeliveryChime() {
  try {
    const c = getCtx();
    if (!c) return;
    note(c, 659.25, 0, 1.6, 0.14);   // E5
    note(c, 880.0, 0.55, 1.9, 0.12); // A5
  } catch (e) { /* sound is a nicety */ }
}

// Browsers only allow sound after a user gesture; unlock on the first tap/click anywhere in the POS
export function unlockDeliveryChime() {
  try { getCtx(); } catch (e) { /* ignore */ }
}

// Starts the repeating chime; returns a stop function
export function startDeliveryChimeLoop(intervalMs = 4500) {
  playDeliveryChime();
  const id = setInterval(playDeliveryChime, intervalMs);
  return () => clearInterval(id);
}
