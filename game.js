'use strict';
/* =====================================================================
   GLOAM HOLLOW: A LANTERN WALK — Monsoon Marquee, Kiroween 2026
   A spooky, gentle browser exploration. All art is drawn in code (SVG);
   all sound is synthesized with WebAudio. No image files, no audio
   files, no third-party assets. Built with Kiro from the specs in .kiro/.
   ===================================================================== */

/* ---------------- Audio: everything synthesized ---------------- */
const Audio8 = {
  ctx: null, master: null, windGain: null, hissGain: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    // shared noise buffer
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // wind: looped noise through a wandering bandpass
    const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.55;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.045;
    wind.connect(wf); wf.connect(this.windGain); this.windGain.connect(this.master); wind.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.022;
    lfo.connect(lfoG); lfoG.connect(this.windGain.gain); lfo.start();
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.045;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 150;
    lfo2.connect(lfo2G); lfo2G.connect(wf.frequency); lfo2.start();
    // lantern hiss: faint highpassed noise, gain follows light radius
    const hiss = ctx.createBufferSource(); hiss.buffer = buf; hiss.loop = true; hiss.playbackRate.value = 0.7;
    const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 5200;
    this.hissGain = ctx.createGain(); this.hissGain.gain.value = 0.0;
    hiss.connect(hf); hf.connect(this.hissGain); this.hissGain.connect(this.master); hiss.start();
  },
  setHiss(r) { if (this.hissGain && !this.muted) this.hissGain.gain.setTargetAtTime(0.002 + (r / 280) * 0.008, this.ctx.currentTime, 0.2); },
  tone(freq, t0, dur, type, vol, dest) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  bell(times = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300;
    const dly = ctx.createDelay(1); dly.delayTime.value = 0.27;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    lp.connect(this.master); lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(this.master);
    for (let n = 0; n < times; n++) {
      const t0 = t + n * 1.15, base = 196;
      [[1, .34], [2.02, .17], [2.94, .085], [4.2, .04]].forEach(([m, v]) => this.tone(base * m, t0, 3.6, 'sine', v, lp));
    }
  },
  chime(step = 0) { // wisp chime; pitch climbs as wisps come home
    if (!this.ctx) return;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
    const f = scale[Math.min(step, scale.length - 1)], t = this.ctx.currentTime;
    this.tone(f, t, 0.9, 'triangle', 0.16);
    this.tone(f * 2, t, 0.45, 'sine', 0.05);
    this.tone(f * 1.005, t + 0.07, 0.8, 'triangle', 0.09);
  },
  motif(who) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (who === 'marigold') { // a far-off train whistle, two long tones
      [392, 311].forEach((f, i) => { this.tone(f, t + i * 0.42, 0.5, 'triangle', 0.07); this.tone(f * 1.003, t + i * 0.42, 0.5, 'sine', 0.05); });
    } else if (who === 'sheriff') { // stern, low, official
      this.tone(174.61, t, 0.22, 'square', 0.045); this.tone(146.83, t + 0.26, 0.34, 'square', 0.045);
    } else if (who === 'june') { // music box
      [1046.5, 1318.5, 1567.98, 1318.5].forEach((f, i) => this.tone(f, t + i * 0.13, 0.5, 'sine', 0.075));
    }
  },
  clink() { if (this.ctx) { const t = this.ctx.currentTime; this.tone(2093, t, 0.18, 'sine', 0.09); this.tone(2637, t + 0.03, 0.22, 'sine', 0.06); } },
  rustle() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.8;
    const g = ctx.createGain(); const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.45);
  },
  chord() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392, 493.88, 587.33].forEach(f => this.tone(f, t, 3.2, 'sine', 0.055));
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
    return this.muted;
  }
};

/* ---------------- Shared SVG fragments ---------------- */
const INK = '#0d0b08', BONE = '#e8e0cc', AMBER = '#f2a33c';
const SKY = `
  <rect x="0" y="0" width="960" height="540" fill="#070a18"/>
  <g fill="#e8e0cc">
    <circle cx="80" cy="60" r="1.8"/><circle cx="210" cy="34" r="1.3"/><circle cx="330" cy="80" r="1.6"/>
    <circle cx="470" cy="42" r="1.2"/><circle cx="590" cy="70" r="1.8"/><circle cx="720" cy="30" r="1.3"/>
    <circle cx="845" cy="66" r="1.6"/><circle cx="920" cy="120" r="1.2"/><circle cx="150" cy="120" r="1.1"/>
    <circle cx="520" cy="110" r="1.1"/><circle cx="40" cy="170" r="1.2"/><circle cx="890" cy="180" r="1.1"/>
  </g>
  <path d="M0 300 L130 236 L260 282 L410 214 L560 276 L700 240 L830 284 L960 244 L960 540 L0 540 Z" fill="#101527"/>
  <path d="M0 348 L180 306 L360 340 L540 300 L730 344 L960 312 L960 540 L0 540 Z" fill="#171126"/>`;
const GROUND = (tint = '#241a20') => `
  <rect x="0" y="428" width="960" height="112" fill="${tint}"/>
  <path d="M0 428 Q240 418 480 428 Q720 438 960 428 L960 540 L0 540 Z" fill="#2b1f22"/>
  <g stroke="#120d0c" stroke-width="3" opacity=".55" fill="none">
    <path d="M60 486 q26 -6 52 0"/><path d="M300 508 q30 -7 60 0"/><path d="M560 490 q26 -6 52 0"/>
    <path d="M760 512 q30 -7 60 0"/><path d="M150 522 q22 -5 44 0"/><path d="M660 528 q22 -5 44 0"/>
  </g>
  <g fill="#0f0b09"><ellipse cx="120" cy="470" rx="16" ry="4"/><ellipse cx="420" cy="500" rx="20" ry="5"/><ellipse cx="830" cy="478" rx="15" ry="4"/></g>`;
function ghostSVG(name, extra = '') {
  return `<g class="ghost clickable" data-ghost="${name}" ${extra}>
    <g class="ghost-body">
      <path d="M-26 44 L-26 -6 Q-26 -34 0 -34 Q26 -34 26 -6 L26 44 L17 34 L8 44 L0 34 L-9 44 L-17 34 Z"
        fill="#f4efe0" fill-opacity=".93" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <circle cx="-9" cy="-8" r="4.4" fill="${AMBER}"/><circle cx="9" cy="-8" r="4.4" fill="${AMBER}"/>
      <path d="M-5 6 Q0 9 5 6" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    </g></g>`;
}
function tinSVG(x, y) {
  return `<g class="tin clickable" data-tin="1" transform="translate(${x} ${y})">
    <rect x="-13" y="-11" width="26" height="22" rx="4" fill="#8c5a24" stroke="${INK}" stroke-width="4"/>
    <rect x="-13" y="-4" width="26" height="5" fill="${AMBER}"/>
    <path d="M-6 -11 Q0 -19 6 -11" fill="none" stroke="${INK}" stroke-width="3.4"/>
    <circle cx="0" cy="3" r="3" fill="#ffe9b0"/>
  </g>`;
}

/* ---------------- The six scenes ---------------- */
const SCENES = {
  tower: {
    name: 'The Lantern Tower', left: null, right: 'chapel',
    art: SKY + GROUND('#201722') + `
    <g stroke="${INK}" stroke-width="6" stroke-linejoin="round">
      <path d="M408 428 L436 130 L524 130 L552 428 Z" fill="#3d2c22"/>
      <path d="M420 340 L540 340 M428 258 L532 258 M434 182 L526 182" stroke-width="5"/>
      <path d="M436 130 L480 84 L524 130 Z" fill="#59331d"/>
      <rect x="452" y="98" width="56" height="46" rx="5" fill="#191410"/>
      <g class="tower-lamp-off"><rect x="466" y="108" width="28" height="26" rx="3" fill="#0a0a0c" stroke-width="4"/></g>
      <g class="tower-lamp-on" style="display:none">
        <g class="tower-rays" stroke="${AMBER}" stroke-width="4" stroke-linecap="round">
          <path d="M480 78 L480 52"/><path d="M446 88 L428 68"/><path d="M514 88 L532 68"/>
          <path d="M440 118 L412 118"/><path d="M520 118 L548 118"/>
        </g>
        <rect x="466" y="108" width="28" height="26" rx="3" fill="#ffca55" stroke-width="4"/>
        <circle cx="480" cy="121" r="26" fill="#ffbe46" opacity=".35" stroke="none"/>
      </g>
      <path d="M452 428 L458 372 L502 372 L508 428 Z" fill="#2b1d15"/>
    </g>
    <g stroke="${INK}" stroke-width="5" stroke-linejoin="round">
      <path d="M330 428 L344 396 L392 396 L398 428 Z" fill="#4a3826"/>
      <path d="M596 428 L604 402 L640 402 L646 428 Z" fill="#4a3826"/>
      <rect x="120" y="392" width="52" height="36" rx="4" fill="#33241a"/>
      <rect x="132" y="380" width="28" height="14" rx="3" fill="#241812"/>
      <path d="M700 428 L706 386 L716 386 L722 428 Z" fill="#241a12"/>
      <rect x="700" y="372" width="22" height="16" rx="3" fill="#191410"/>
    </g>
    <g transform="translate(648 428)"><path d="M0 0 L5 -52 M5 -52 L-8 -30 M5 -52 L18 -32" stroke="#17301c" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="5" cy="-56" r="5" fill="#7a9a52" stroke="${INK}" stroke-width="3"/></g>`,
    spots: [
      { id: 'tower-steps', x: 480, y: 386, label: 'on the tower steps' },
      { id: 'tower-niche', x: 146, y: 372, label: 'in the spare-lantern crate' },
      { id: 'tower-bush', x: 622, y: 402, label: 'behind the tower stones' }
    ],
    tins: [{ x: 712, y: 424 }]
  },
  chapel: {
    name: 'Chapel Hill', left: 'tower', right: 'well',
    art: SKY + `
    <path d="M0 452 Q300 372 560 404 Q780 428 960 408 L960 540 L0 540 Z" fill="#2b1f22"/>
    <path d="M0 452 Q300 372 560 404 Q780 428 960 408" fill="none" stroke="#120d0c" stroke-width="3" opacity=".5"/>
    <g stroke="${INK}" stroke-width="6" stroke-linejoin="round">
      <path d="M386 356 L386 236 L574 236 L574 356 Z" fill="#ddd2b4"/>
      <path d="M368 240 L480 168 L592 240 Z" fill="#59331d"/>
      <path d="M452 236 L452 176 L508 176 L508 236 Z" fill="#cfc2a2"/>
      <path d="M444 180 L480 148 L516 180 Z" fill="#59331d"/>
      <rect x="468" y="158" width="24" height="26" rx="10" fill="#191410"/>
      <path d="M480 136 L480 118 M472 126 L488 126" stroke="${AMBER}" stroke-width="5" stroke-linecap="round"/>
      <rect x="456" y="282" width="48" height="74" rx="20" fill="#4a2f1d"/>
      <rect x="404" y="262" width="30" height="40" rx="13" fill="#7d2e22"/>
      <rect x="526" y="262" width="30" height="40" rx="13" fill="#31556b"/>
      <path d="M340 428 L356 356 M620 428 L606 362" stroke-width="5"/>
    </g>
    <g stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" fill="#cfc6ab">
      <path d="M120 452 L120 414 Q120 402 132 402 Q144 402 144 414 L144 452 Z"/>
      <path d="M196 462 L196 430 Q196 420 206 420 Q216 420 216 430 L216 462 Z"/>
      <path d="M716 446 L716 410 Q716 398 728 398 Q740 398 740 410 L740 446 Z"/>
      <path d="M788 456 L788 426 Q788 416 798 416 Q808 416 808 426 L808 456 Z"/>
      <path d="M262 448 L274 420 L286 448 Z" fill="#bdb294"/>
    </g>
    <g stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round">
      <path d="M60 470 L940 452" opacity=".35"/>
    </g>
    <g transform="translate(90 470)"><path d="M0 0 L4 -40 M4 -40 L-8 -24 M4 -40 L16 -26" stroke="#17301c" stroke-width="5" fill="none" stroke-linecap="round"/></g>
    <g transform="translate(872 462)"><path d="M0 0 L4 -46 M4 -46 L-10 -28 M4 -46 L18 -30" stroke="#17301c" stroke-width="5" fill="none" stroke-linecap="round"/></g>`,
    spots: [
      { id: 'chapel-bell', x: 480, y: 205, label: 'under the chapel bell' },
      { id: 'chapel-stones', x: 728, y: 392, label: 'behind a chapel gravestone' },
      { id: 'chapel-door', x: 540, y: 330, label: 'in the chapel doorway shadow' }
    ],
    tins: []
  },
  well: {
    name: 'Well Square', left: 'chapel', right: 'main',
    art: SKY + GROUND() + `
    <g stroke="${INK}" stroke-width="6" stroke-linejoin="round">
      <path d="M398 428 L398 348 Q398 330 416 330 L544 330 Q562 330 562 348 L562 428 Z" fill="#5d5348"/>
      <path d="M398 372 L562 372 M398 402 L562 402" stroke-width="4" opacity=".6"/>
      <rect x="404" y="252" width="14" height="86" fill="#4a2f1d"/>
      <rect x="542" y="252" width="14" height="86" fill="#4a2f1d"/>
      <path d="M386 258 L480 208 L574 258 L562 272 L480 228 L398 272 Z" fill="#7d2e22"/>
      <rect x="404" y="318" width="152" height="10" fill="#4a2f1d"/>
      <path d="M480 272 L480 322" stroke-width="4"/>
      <g class="well-bucket">
        <path d="M462 322 L498 322 L492 352 L468 352 Z" fill="#8c5a24"/>
        <path d="M462 322 Q480 308 498 322" fill="none" stroke-width="4"/>
      </g>
      <ellipse class="well-glow" cx="480" cy="338" rx="30" ry="9" fill="${AMBER}" opacity="0"/>
      <rect x="150" y="368" width="120" height="60" rx="5" fill="#4f3d2c"/>
      <rect x="150" y="368" width="120" height="12" fill="#3a2c1e"/>
      <path d="M96 428 L104 372 L112 428 Z" fill="#241a12"/>
      <rect x="98" y="356" width="12" height="18" rx="3" fill="#191410"/>
      <path d="M700 428 L716 356 L760 356 L776 428 Z" fill="#3d2c22"/>
      <rect x="706" y="338" width="64" height="20" rx="4" fill="#59331d"/>
    </g>
    <g transform="translate(852 452)"><path d="M0 0 L6 -64 M6 -64 L-12 -38 M6 -64 L24 -40 M6 -64 L6 -34" stroke="#17301c" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="-14" cy="-34" r="5" fill="#c2503c" stroke="${INK}" stroke-width="3"/><circle cx="26" cy="-36" r="5" fill="#c2503c" stroke="${INK}" stroke-width="3"/></g>
    <g transform="translate(60 462)"><path d="M0 0 L4 -44 M4 -44 L-8 -28 M4 -44 L16 -30" stroke="#17301c" stroke-width="5" fill="none" stroke-linecap="round"/></g>`,
    spots: [
      { id: 'well-bucket', x: 480, y: 316, label: 'inside the well bucket' },
      { id: 'well-wall', x: 210, y: 356, label: 'on the low adobe wall' },
      { id: 'well-cactus', x: 852, y: 380, label: 'behind the tall cactus' }
    ],
    tins: [{ x: 738, y: 424 }]
  },
  main: {
    name: 'Main Street', left: 'well', right: 'depot',
    art: SKY + GROUND('#231a1e') + `
    <g stroke="${INK}" stroke-width="6" stroke-linejoin="round">
      <path d="M28 428 L28 268 L238 268 L238 428 Z" fill="#6e4a2f"/>
      <path d="M14 272 L252 272 L238 240 L28 240 Z" fill="#59331d"/>
      <rect x="52" y="298" width="72" height="58" fill="#2c3542"/>
      <path d="M52 327 L124 327 M88 298 L88 356" stroke-width="4"/>
      <rect x="152" y="352" width="56" height="76" rx="4" fill="#4a2f1d"/>
      <rect x="40" y="216" width="196" height="26" fill="#ddd2b4"/>
      <text x="138" y="236" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="#241708" stroke="none" letter-spacing="2">UNDERTAKER</text>
      <path d="M690 428 L690 258 L934 258 L934 428 Z" fill="#31556b"/>
      <path d="M676 262 L948 262 L932 232 L692 232 Z" fill="#24404f"/>
      <rect x="716" y="292" width="82" height="62" fill="#2c3542"/>
      <path d="M716 323 L798 323 M757 292 L757 354" stroke-width="4"/>
      <rect x="828" y="346" width="58" height="82" rx="4" fill="#4a2f1d"/>
      <rect x="700" y="206" width="224" height="26" fill="#ddd2b4"/>
      <text x="812" y="226" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="#241708" stroke="none" letter-spacing="2">GENERAL STORE</text>
      <path d="M676 428 L948 428 L948 442 L676 442 Z" fill="#4a3826" stroke-width="4"/>
      <path d="M300 428 L306 388 L340 388 L346 428 Z" fill="#8c5a24"/>
      <path d="M300 402 L346 402 M300 416 L346 416" stroke-width="4"/>
      <path d="M586 428 L592 392 L622 392 L628 428 Z" fill="#6e4a2f"/>
      <path d="M470 428 L470 372 M448 372 L492 372" stroke-width="5"/>
    </g>
    <g transform="translate(392 452)"><path d="M0 0 L4 -42 M4 -42 L-8 -26 M4 -42 L16 -28" stroke="#17301c" stroke-width="5" fill="none" stroke-linecap="round"/></g>`,
    spots: [
      { id: 'main-barrel', x: 322, y: 380, label: 'inside the street barrel' },
      { id: 'main-sign', x: 138, y: 206, label: 'behind the undertaker sign' },
      { id: 'main-porch', x: 812, y: 420, label: 'under the store porch' }
    ],
    tins: [{ x: 470, y: 424 }]
  },
  depot: {
    name: 'The Depot', left: 'main', right: 'arroyo',
    art: SKY + GROUND('#211a20') + `
    <g stroke="${INK}" stroke-width="6" stroke-linejoin="round">
      <path d="M96 380 L96 236 L430 236 L430 380 Z" fill="#7a4a34"/>
      <path d="M78 240 L448 240 L420 200 L106 200 Z" fill="#59331d"/>
      <rect x="128" y="268" width="86" height="64" fill="#2c3542"/>
      <path d="M128 300 L214 300 M171 268 L171 332" stroke-width="4"/>
      <rect x="330" y="288" width="58" height="92" rx="4" fill="#4a2f1d"/>
      <rect x="196" y="158" width="150" height="30" fill="#ddd2b4"/>
      <text x="271" y="180" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#241708" stroke="none" letter-spacing="1.5">GLOAM HOLLOW</text>
      <path d="M60 380 L560 380 L560 396 L60 396 Z" fill="#4a3826" stroke-width="4"/>
      <path d="M560 396 L560 428 M60 396 L60 428" stroke-width="5"/>
      <path d="M640 380 L652 210 L700 210 L712 380 Z" fill="#3d2c22"/>
      <path d="M636 214 L716 214 L700 178 L652 178 Z" fill="#59331d"/>
      <rect x="660" y="238" width="32" height="46" fill="#2c3542"/>
      <path d="M180 428 L196 396 L268 396 L276 428 Z" fill="#4a2f1d"/>
      <path d="M180 410 L276 410" stroke-width="4"/>
      <g><rect x="742" y="356" width="86" height="52" rx="6" fill="#31556b"/>
      <rect x="742" y="376" width="86" height="8" fill="${AMBER}"/>
      <path d="M758 356 L764 340 L806 340 L812 356" fill="none" stroke-width="4.5"/></g>
      <path d="M0 470 L960 452 M0 502 L960 488" stroke-width="7" stroke="#151312"/>
      <g stroke="#151312" stroke-width="5"><path d="M40 466 L52 498 M160 464 L172 496 M280 462 L292 494 M400 460 L412 492 M520 458 L532 490 M640 456 L652 488 M760 454 L772 486 M880 452 L892 484"/></g>
    </g>`,
    spots: [
      { id: 'depot-bench', x: 228, y: 388, label: 'behind the depot bench' },
      { id: 'depot-trunk', x: 785, y: 332, label: 'inside the luggage trunk' },
      { id: 'depot-tower', x: 676, y: 300, label: 'up by the water tower' }
    ],
    tins: []
  },
  arroyo: {
    name: 'The Dry Arroyo', left: 'depot', right: null,
    art: SKY + `
    <path d="M0 428 L0 330 Q240 300 430 344 Q620 386 960 330 L960 428 L960 540 L0 540 Z" fill="#33231d"/>
    <path d="M0 428 Q260 470 480 462 Q720 454 960 428 L960 540 L0 540 Z" fill="#3d2a20"/>
    <g stroke="#1d130e" stroke-width="3" fill="none" opacity=".65">
      <path d="M120 486 l34 -8 22 10 30 -6"/><path d="M520 500 l30 -8 24 10 28 -6"/>
      <path d="M700 478 l28 -6 20 9"/><path d="M300 516 l30 -7 22 9 26 -5"/>
    </g>
    <g stroke="${INK}" stroke-width="6" stroke-linejoin="round">
      <path d="M96 420 L130 372 L196 366 L228 420 Z" fill="#5d5348"/>
      <path d="M130 372 L168 388 L196 366" fill="none" stroke-width="4" opacity=".6"/>
      <path d="M742 428 L776 380 L838 376 L866 428 Z" fill="#66584c"/>
      <path d="M560 448 L600 424 L660 424 L690 448 Z" fill="#4f4438"/>
      <g><path d="M330 442 L342 404 L396 404 L408 442 Z" fill="#8a4a30"/>
      <path d="M342 404 Q369 388 396 404" fill="none" stroke-width="4.5"/>
      <path d="M336 420 L402 420" stroke-width="4" opacity=".6"/></g>
      <g stroke-width="5" stroke-linecap="round">
        <path d="M468 452 L474 402 M474 402 L458 420 M474 402 L492 418" stroke="#5d4a2e" fill="none"/>
        <path d="M862 452 L866 414 M866 414 L854 428 M866 414 L878 426" stroke="#5d4a2e" fill="none"/>
      </g>
      <circle cx="238" cy="438" r="17" fill="#7a6a54"/>
      <path d="M224 430 q14 -10 28 0" fill="none" stroke-width="4"/>
    </g>
    <g transform="translate(52 452)"><path d="M0 0 L5 -50 M5 -50 L-9 -32 M5 -50 L19 -34" stroke="#17301c" stroke-width="6" fill="none" stroke-linecap="round"/></g>`,
    spots: [
      { id: 'arroyo-pot', x: 369, y: 392, label: 'inside the cracked pot' },
      { id: 'arroyo-rock', x: 162, y: 356, label: 'behind the big arroyo boulder' },
      { id: 'arroyo-weed', x: 238, y: 416, label: 'inside the tumbleweed' }
    ],
    tins: []
  }
};
const SCENE_ORDER = ['tower', 'chapel', 'well', 'main', 'depot', 'arroyo'];
const WELL = { scene: 'well', x: 480, y: 360 };
const GHOST_SPOTS = {
  marigold: { scene: 'depot', x: 520, y: 330, name: 'Marigold, Keeper of the Depot' },
  sheriff: { scene: 'main', x: 480, y: 396, name: 'The Undersheriff' },
  june: { scene: 'arroyo', x: 300, y: 400, name: 'Little June' }
};
const CROWN_SPOTS = [
  { id: 'crown-rock', x: 618, y: 414, label: 'under the flat rock' },
  { id: 'crown-bush', x: 474, y: 392, label: 'in the dry bush' },
  { id: 'crown-bones', x: 866, y: 404, label: 'beside the old mesquite' }
];

/* ---------------- Dialogue (all original) ---------------- */
function hintLine() {
  const rem = wisps.filter(w => w.state === 'hidden');
  if (!rem.length) return null;
  const cur = SCENE_ORDER.indexOf(state.scene);
  let best = null, bd = 99;
  rem.forEach(w => { const d = Math.abs(SCENE_ORDER.indexOf(w.scene) - cur); if (d < bd) { bd = d; best = w; } });
  if (!best) return null;
  const dir = SCENE_ORDER.indexOf(best.scene) < cur ? 'west of here' : (SCENE_ORDER.indexOf(best.scene) > cur ? 'east of here' : 'right here, keeper');
  return { dir, sceneName: SCENES[best.scene].name };
}
const DIALOGUES = {
  marigold: {
    first: [
      "Mind the platform edge, keeper. The 9:15 to Nowhere is running late — it's been late since 1911.",
      "I'm Marigold. I keep the depot, the timetable, and the town's waiting. We are very good at waiting here.",
      "Your wisps? Embers with no sense of schedule. One rustled behind my bench like a lost ticket stub. Search the way you'd read a timetable — carefully, and twice."
    ],
    again: () => {
      const h = hintLine();
      return h ? [`Departure board says: one of your embers is ${h.dir} — ${h.sceneName}. No refunds on missed connections, keeper.`]
               : ["All departures accounted for, keeper. The well is doing its quiet work."];
    },
    finale: "On time at last. Every single one, on time."
  },
  sheriff: {
    first: [
      "Evening. Undersheriff — one street, one patrol, zero incidents since the town emptied. I intend to keep it that way.",
      "Your embers are disturbing the peace, keeper. Round them up quiet-like, two at a time, and let the well do the rest.",
      "And if you happen to see a lawman's star anywhere… no. A lawman does not misplace his star. Move along."
    ],
    again: () => {
      const h = hintLine();
      return h ? [`Patrol report: ember activity ${h.dir} — ${h.sceneName}. I logged it. I log everything.`]
               : ["Street's quiet, keeper. Quieter than it's been in a hundred years."];
    },
    finale: "Zero incidents. Finest night of my patrol."
  },
  june: {
    before: [
      "You're the new keeper! I'm June. I lost my paper crown in the arroyo — the wind took it in 1911 and I never did get it back.",
      "Find it for me? It's only paper, but it catches lantern light something lovely. Then I'll tell you a secret about a wisp. A real secret."
    ],
    hasCrown: [
      "That's it! That's my crown! Oh — look at it glow. Just like the night of the school pageant.",
      "A secret, as promised: one of your wisps is hiding where I've left a little sparkle — a light that isn't yours. Follow it, keeper."
    ],
    after: [
      "When the tower lights, I'm going to wave. I've been practicing since 1911."
    ],
    finale: "I waved! Did you see? I waved!"
  }
};

/* ---------------- State ---------------- */
const $ = id => document.getElementById(id);
const stage = $('stage'), world = $('world'), keeperEl = $('keeper');
const state = {
  mode: 'title',        // title | play | dialogue | finale | end
  scene: 'well',
  keeperX: 480, targetX: 480,
  lightX: 480, lightY: 445, lightTX: 480, lightTY: 445, lightFree: false, lightIdle: 0,
  radius: 165, playTime: 0, tolls: 0, nextToll: 60,
  oil: 100, returned: 0, carried: [],
  hasCrown: false, crownDone: false, metGhosts: {},
  startedAt: 0, elapsed: 0, sheriffDir: 1
};
let wisps = [], crown = null, usedTins = new Set(), markedWisp = null;
const rand = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function newLayout() {
  const pool = [];
  SCENE_ORDER.forEach(s => SCENES[s].spots.forEach(sp => pool.push({ scene: s, ...sp })));
  shuffle(pool);
  const chosen = [], perScene = {};
  for (const sp of pool) {
    if (chosen.length >= 7) break;
    if ((perScene[sp.scene] || 0) >= 2) continue;
    chosen.push(sp); perScene[sp.scene] = (perScene[sp.scene] || 0) + 1;
  }
  wisps = chosen.map(sp => ({ ...sp, state: 'hidden', glimmerAt: 2 + Math.random() * 6 }));
  crown = { ...rand(CROWN_SPOTS), taken: false };
  usedTins = new Set(); markedWisp = null;
}

/* ---------------- Rendering ---------------- */
const SVGNS = 'http://www.w3.org/2000/svg';
function wispGroup(w) {
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'wisp clickable');
  g.setAttribute('transform', `translate(${w.x} ${w.y})`);
  g.innerHTML = `
    <circle r="21" fill="#ffbe46" opacity=".28"/>
    <circle class="wisp-core" r="10" fill="#ffca55" stroke="${INK}" stroke-width="3.5"/>
    <circle r="4" cx="-2" cy="-2" fill="#fff3c4"/>
    <path d="M0 -17 Q3 -24 0 -29 Q-3 -24 0 -17" fill="#ff9d2e"/>`;
  g.addEventListener('pointerdown', ev => { ev.stopPropagation(); tryPickup(w, g); });
  return g;
}
function renderScene() {
  const sc = SCENES[state.scene];
  let html = sc.art;
  // ghosts in this scene
  for (const [key, gs] of Object.entries(GHOST_SPOTS)) {
    if (gs.scene !== state.scene) continue;
    const x = key === 'sheriff' ? state.sheriffX : gs.x;
    html += ghostSVG(key, `transform="translate(${x} ${gs.y})"`);
    html += `<text x="${x}" y="${gs.y + 66}" text-anchor="middle" font-family="Georgia,serif" font-size="14.5" fill="#e8e0cc" opacity=".85">${key === 'sheriff' ? 'The Undersheriff' : key === 'marigold' ? 'Marigold' : 'Little June'}</text>`;
  }
  // crown in the arroyo
  if (state.scene === 'arroyo' && crown && !crown.taken) {
    html += `<g class="crown clickable" data-crown="1" transform="translate(${crown.x} ${crown.y})">
      <path d="M-15 8 L-15 -8 L-7 0 L0 -13 L7 0 L15 -8 L15 8 Z" fill="#e8e0cc" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="0" cy="2" r="2.6" fill="${AMBER}"/></g>`;
  }
  // oil tins in this scene
  sc.tins.forEach((t, i) => { if (!usedTins.has(state.scene + ':' + i)) html += tinSVG(t.x, t.y); });
  world.innerHTML = html;
  // wisp elements (live nodes, so pickup can animate them)
  wisps.filter(w => w.scene === state.scene && w.state === 'hidden').forEach(w => {
    const g = wispGroup(w); g.style.opacity = '0'; g.dataset.wispId = w.id; world.appendChild(g); w.el = g;
  });
  // crown / tin click handlers (delegated below for tins; crown direct)
  world.querySelectorAll('.crown').forEach(el => el.addEventListener('pointerdown', ev => { ev.stopPropagation(); tryCrown(); }));
  world.querySelectorAll('.tin').forEach(el => el.addEventListener('pointerdown', ev => { ev.stopPropagation(); tryTin(el); }));
  world.querySelectorAll('.ghost').forEach(el => el.addEventListener('pointerdown', ev => { ev.stopPropagation(); talkTo(el.dataset.ghost); }));
  $('scene-name').textContent = sc.name;
  $('nav-left').classList.toggle('hidden', !sc.left);
  $('nav-right').classList.toggle('hidden', !sc.right);
  positionKeeper();
  updateSparkle();
}
let stageRect = null;
function refreshRect() { stageRect = stage.getBoundingClientRect(); }
function positionKeeper() {
  if (!stageRect) refreshRect();
  const r = stageRect;
  const x = (state.keeperX / 960) * r.width, y = (452 / 540) * r.height;
  keeperEl.style.transform = `translate(${x - 22}px, ${y - 66}px)`;
  stage.style.setProperty('--lx', (state.lightX / 960 * 100) + '%');
  stage.style.setProperty('--ly', (state.lightY / 540 * 100) + '%');
  const lr = state.radius * (r.width / 960);
  stage.style.setProperty('--lr', lr + 'px');
  Audio8.setHiss(state.radius);
}
function updateHUD() {
  $('oil-fill').style.width = Math.max(0, state.oil) + '%';
  $('oil-bar').classList.toggle('low', state.oil < 30);
  $('objective').textContent = `Wisps returned: ${state.returned} / 7`;
  $('tolls').innerHTML = Array.from({ length: 7 }, (_, i) =>
    `<span class="${i < state.tolls ? 'tolled' : 'untolled'}">🔔</span>`).join('');
  $('carried').innerHTML = [0, 1].map(i =>
    `<span class="slot ${state.carried[i] ? 'full' : ''}">${state.carried[i] ? '' : ''}</span>`).join('') +
    (state.hasCrown && !state.crownDone ? '<span class="slot" title="June\'s paper crown" style="border-style:solid">👑</span>' : '');
  const cw = $('carried-wisps');
  cw.innerHTML = state.carried.map((w, i) => `<span class="cw" style="left:${8 + i * 34}px;top:${i % 2 ? 8 : 0}px"></span>`).join('');
  const wg = world.querySelector('.well-glow');
  if (wg) wg.setAttribute('opacity', (state.returned / 7 * 0.55).toFixed(2));
}
function updateSparkle() {
  const sp = $('sparkle');
  if (markedWisp && markedWisp.state === 'hidden' && markedWisp.scene === state.scene) {
    sp.classList.remove('hidden');
    sp.style.left = (markedWisp.x / 960 * 100) + '%';
    sp.style.top = (markedWisp.y / 540 * 100) + '%';
  } else sp.classList.add('hidden');
}
let captionTimer = null;
function caption(text, ms = 2600) {
  const c = $('caption');
  c.textContent = text; c.classList.remove('hidden');
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => c.classList.add('hidden'), ms);
}

/* ---------------- Dialogue ---------------- */
let dlg = null;
function openDialogue(name, lines, onDone) {
  state.mode = 'dialogue';
  dlg = { name, lines, i: 0, onDone };
  $('dlg-name').textContent = name;
  $('dlg-text').textContent = lines[0];
  $('dialogue').classList.remove('hidden');
}
function advanceDialogue() {
  if (!dlg) return;
  dlg.i++;
  if (dlg.i >= dlg.lines.length) {
    $('dialogue').classList.add('hidden');
    const cb = dlg.onDone; dlg = null; state.mode = 'play';
    if (cb) cb();
  } else $('dlg-text').textContent = dlg.lines[dlg.i];
}
$('dialogue').addEventListener('pointerdown', e => { e.stopPropagation(); advanceDialogue(); });

function talkTo(who) {
  if (state.mode !== 'play') return;
  const gs = GHOST_SPOTS[who];
  Audio8.motif(who);
  if (who === 'june') {
    const crownReward = () => {
      state.crownDone = true;
      const rem = wisps.filter(w => w.state === 'hidden');
      if (rem.length) { markedWisp = rand(rem); updateSparkle(); caption('June\'s sparkle marks a hiding wisp ✨', 3400); }
      updateHUD();
    };
    if (!state.metGhosts.june) {
      state.metGhosts.june = true;
      if (state.hasCrown && !state.crownDone) openDialogue(gs.name, [...DIALOGUES.june.before, ...DIALOGUES.june.hasCrown], crownReward);
      else openDialogue(gs.name, DIALOGUES.june.before);
    }
    else if (state.hasCrown && !state.crownDone) openDialogue(gs.name, DIALOGUES.june.hasCrown, crownReward);
    else openDialogue(gs.name, state.crownDone ? DIALOGUES.june.after : DIALOGUES.june.before);
    return;
  }
  const d = DIALOGUES[who];
  if (!state.metGhosts[who]) { state.metGhosts[who] = true; openDialogue(gs.name, d.first); }
  else openDialogue(gs.name, d.again());
}

/* ---------------- Actions ---------------- */
function inLight(x, y) {
  const dx = x - state.lightX, dy = y - state.lightY;
  return Math.hypot(dx, dy) <= state.radius + 26;
}
function tryPickup(w, g) {
  if (state.mode !== 'play' || w.state !== 'hidden') return;
  if (!inLight(w.x, w.y)) { caption('Too dark — bring your light closer.'); return; }
  if (state.carried.length >= 2) { caption('Your hands are full — two wisps is all you can carry.'); return; }
  w.state = 'carried'; state.carried.push(w);
  Audio8.chime(state.returned + state.carried.length);
  if (g) g.remove();
  caption(`A wisp settles into your hands. (${state.carried.length} carried)`);
  updateHUD(); updateSparkle();
}
function depositWisps() {
  if (!state.carried.length) return;
  const n = state.carried.length;
  state.carried.forEach((w, i) => setTimeout(() => Audio8.chime(state.returned + i), i * 160));
  state.returned += n; state.carried = [];
  caption(n === 1 ? 'The wisp comes to rest at the well.' : `${n} wisps come to rest at the well.`, 2200);
  updateHUD();
  if (state.returned >= 7) startFinale();
}
function tryTin(el) {
  if (state.mode !== 'play') return;
  const sc = SCENES[state.scene];
  const idx = [...world.querySelectorAll('.tin')].indexOf(el);
  // find the matching untaken tin by DOM order among remaining tins
  const remaining = sc.tins.map((t, i) => ({ t, i })).filter(({ i }) => !usedTins.has(state.scene + ':' + i));
  const match = remaining[idx]; if (!match) return;
  if (!inLight(match.t.x, match.t.y)) { caption('Too dark — bring your light closer.'); return; }
  usedTins.add(state.scene + ':' + match.i);
  state.oil = Math.min(100, state.oil + 45);
  Audio8.clink();
  caption('An oil tin! The lantern drinks deep. (+oil)');
  el.remove(); updateHUD();
}
function tryCrown() {
  if (state.mode !== 'play' || !crown || crown.taken) return;
  if (!inLight(crown.x, crown.y)) { caption('Something pale glimmers there — bring your light closer.'); return; }
  crown.taken = true; state.hasCrown = true;
  Audio8.rustle(); setTimeout(() => Audio8.chime(2), 120);
  caption('June\'s paper crown! Carry it back to her.');
  renderScene(); updateHUD();
}
function goScene(dir) {
  const sc = SCENES[state.scene];
  const next = dir < 0 ? sc.left : sc.right;
  if (!next || state.mode !== 'play') return;
  state.scene = next;
  state.keeperX = dir < 0 ? 880 : 80;
  state.targetX = state.keeperX;
  state.lightX = state.lightTX = state.keeperX;
  state.lightY = state.lightTY = 445;
  state.lightFree = false;
  state.sheriffX = GHOST_SPOTS.sheriff.x;
  renderScene(); updateHUD();
  caption(SCENES[next].name, 1500);
}
$('nav-left').addEventListener('click', () => goScene(-1));
$('nav-right').addEventListener('click', () => goScene(1));
// keep stage pointer handling from double-firing navigation off the arrow buttons
$('nav-left').addEventListener('pointerdown', e => e.stopPropagation());
$('nav-right').addEventListener('pointerdown', e => e.stopPropagation());

/* ---------------- Input ---------------- */
function stageCoords(e) {
  if (!stageRect) refreshRect();
  const r = stageRect;
  return { x: (e.clientX - r.left) / r.width * 960, y: (e.clientY - r.top) / r.height * 540 };
}
function aimLight(p) {
  state.lightTX = Math.max(10, Math.min(950, p.x));
  state.lightTY = Math.max(20, Math.min(530, p.y));
  state.lightFree = true; state.lightIdle = 0;
}
const pointers = new Map(); let pinchDist = 0;
stage.addEventListener('pointerdown', e => {
  Audio8.init();
  if (state.mode === 'dialogue') { advanceDialogue(); return; }
  if (state.mode !== 'play') return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    return;
  }
  const p = stageCoords(e);
  aimLight(p);
  if (p.x < 56 && SCENES[state.scene].left) { goScene(-1); return; }
  if (p.x > 904 && SCENES[state.scene].right) { goScene(1); return; }
  state.targetX = Math.max(30, Math.min(930, p.x));
});
stage.addEventListener('pointermove', e => {
  if (state.mode !== 'play') return;
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0) setRadius(state.radius * (d / pinchDist));
    pinchDist = d;
    return;
  }
  if (e.pointerType === 'mouse' || pointers.size === 1) {
    const p = stageCoords(e);
    aimLight(p);
    state.targetX = Math.max(30, Math.min(930, p.x));
  }
});
const endPointer = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchDist = 0; };
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);
stage.addEventListener('wheel', e => {
  if (state.mode !== 'play') return;
  e.preventDefault();
  setRadius(state.radius + (e.deltaY < 0 ? 16 : -16));
}, { passive: false });
function setRadius(r) { state.radius = Math.max(70, Math.min(280, r)); positionKeeper(); }

window.addEventListener('keydown', e => {
  if (state.mode === 'dialogue') {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advanceDialogue(); }
    return;
  }
  if (state.mode !== 'play') return;
  const k = e.key.toLowerCase();
  state.lightFree = false; // keyboard play: the light stays with the keeper
  if (k === 'arrowleft' || k === 'a') {
    e.preventDefault();
    if (state.keeperX <= 92 && SCENES[state.scene].left) goScene(-1);
    else state.targetX = Math.max(30, state.targetX - 130);
  } else if (k === 'arrowright' || k === 'd') {
    e.preventDefault();
    if (state.keeperX >= 868 && SCENES[state.scene].right) goScene(1);
    else state.targetX = Math.min(930, state.targetX + 130);
  } else if (k === 'q') goScene(-1);
  else if (k === 'e') goScene(1);
  else if (k === 'arrowup' || k === 'w' || k === '+') { e.preventDefault(); setRadius(state.radius + 14); }
  else if (k === 'arrowdown' || k === 's' || k === '-') { e.preventDefault(); setRadius(state.radius - 14); }
});
window.addEventListener('resize', () => { refreshRect(); positionKeeper(); });

/* ---------------- The walk itself ---------------- */
let lastT = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
  if (state.mode !== 'play') return;
  state.playTime += dt;
  // the bell
  if (state.playTime >= state.nextToll) {
    state.tolls++; state.nextToll += 60;
    Audio8.bell(1);
    if (state.tolls >= 7) { midnightFail(); return; }
    caption(`The Hollow Bell tolls — ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][state.tolls - 1]} toll.`, 3000);
    updateHUD();
  }
  // the oil
  const drain = (100 / 420) * Math.pow(state.radius / 165, 1.6);
  state.oil -= drain * dt;
  if (state.oil <= 0) { state.oil = 0; updateHUD(); lanternFail(); return; }
  // the keeper walks
  const dx = state.targetX - state.keeperX;
  if (Math.abs(dx) > 3) {
    state.keeperX += Math.sign(dx) * Math.min(Math.abs(dx), 265 * dt);
  }
  // the lantern light follows the hand; left alone, it drifts back to the keeper
  state.lightIdle += dt;
  if (state.lightIdle > 2.5) state.lightFree = false;
  const ltx = state.lightFree ? state.lightTX : state.keeperX;
  const lty = state.lightFree ? state.lightTY : 445;
  const lk = Math.min(1, dt * 11);
  state.lightX += (ltx - state.lightX) * lk;
  state.lightY += (lty - state.lightY) * lk;
  positionKeeper();
  // the Undersheriff patrols his one street, very seriously
  if (state.scene === 'main') {
    state.sheriffX += state.sheriffDir * 20 * dt;
    if (state.sheriffX > 660) state.sheriffDir = -1;
    if (state.sheriffX < 300) state.sheriffDir = 1;
    const g = world.querySelector('[data-ghost="sheriff"]');
    if (g) {
      g.setAttribute('transform', `translate(${state.sheriffX} ${GHOST_SPOTS.sheriff.y})`);
      const label = g.nextElementSibling;
      if (label && label.tagName === 'text') label.setAttribute('x', state.sheriffX);
    }
  }
  // wisps: revealed by light, with the occasional faint glimmer
  wisps.forEach(w => {
    if (w.scene !== state.scene || w.state !== 'hidden' || !w.el) return;
    if (inLight(w.x, w.y)) { w.el.style.opacity = '0.96'; return; }
    w.glimmerAt -= dt;
    if (w.glimmerAt < -7) w.glimmerAt = 3 + Math.random() * 6;
    w.el.style.opacity = (w.glimmerAt < 0 && w.glimmerAt > -0.7) ? '0.30' : '0';
  });
  // returning wisps to the well
  if (state.scene === 'well' && state.carried.length && Math.abs(state.keeperX - WELL.x) < 72) depositWisps();
  updateHUD();
}

/* ---------------- Endings ---------------- */
function fmtTime(s) { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return `${m}:${String(ss).padStart(2, '0')}`; }
function startFinale() {
  state.mode = 'finale'; state.elapsed = state.playTime;
  Audio8.bell(2);
  stage.classList.add('lit');
  const seq = ['well', 'main', 'depot', 'arroyo', 'chapel', 'tower'];
  const ghostLine = { main: DIALOGUES.sheriff.finale, depot: DIALOGUES.marigold.finale, arroyo: DIALOGUES.june.finale };
  let i = 0;
  const stepFn = () => {
    if (i >= seq.length) { showEnd(true); return; }
    state.scene = seq[i];
    state.keeperX = state.targetX = 480;
    renderScene(); updateHUD(); positionKeeper();
    if (state.scene === 'tower') {
      const on = world.querySelector('.tower-lamp-on'), off = world.querySelector('.tower-lamp-off');
      if (on) on.style.display = ''; if (off) off.style.display = 'none';
      Audio8.chord(); setTimeout(() => Audio8.bell(1), 250);
      caption('The tower lantern lights.', 1600);
    } else if (ghostLine[state.scene]) caption(ghostLine[state.scene], 1500);
    i++; setTimeout(stepFn, 1000);
  };
  setTimeout(stepFn, 500);
}
function showEnd(won) {
  state.mode = 'end';
  $('end-emoji').textContent = won ? '🏮' : '🌑';
  $('end-title').textContent = won ? 'The Hollow is lit' : 'The Hollow goes dark';
  $('end-text').textContent = won
    ? 'All seven ember-wisps rest at the old town well, and Gloam Hollow glows scene by scene — depot, chapel, arroyo, tower. The ghosts take their bow. Somewhere, a train that never comes is right on time.'
    : 'The dark keeps the town tonight — but a lantern keeper always walks again. The wisps will be waiting, and so will the ghosts.';
  $('end-stats').textContent = won
    ? `Time on the walk: ${fmtTime(state.elapsed)} · Bells tolled: ${state.tolls} of 7 · Oil remaining: ${Math.max(0, Math.round(state.oil))}%`
    : `Wisps returned: ${state.returned} of 7 · Bells tolled: ${state.tolls} of 7`;
  $('again-btn').textContent = won ? 'Walk again' : 'Light the lantern again';
  $('end-screen').classList.remove('hidden');
}
function lanternFail() {
  state.mode = 'end';
  Audio8.bell(1);
  $('end-emoji').textContent = '🕯️';
  $('end-title').textContent = 'The lantern sputters out';
  $('end-text').textContent = 'The flame gutters, thins, and is gone. In the dark, small kind voices call your name — Marigold will keep your place on the timetable until tomorrow night.';
  $('end-stats').textContent = `Wisps returned: ${state.returned} of 7 · Bells tolled: ${state.tolls} of 7 · The oil ran dry — narrow your light, and look for tins.`;
  $('again-btn').textContent = 'Light the lantern again';
  $('end-screen').classList.remove('hidden');
}
function midnightFail() {
  state.mode = 'end';
  updateHUD();
  $('end-emoji').textContent = '🌑';
  $('end-title').textContent = 'Midnight — the seventh toll';
  $('end-text').textContent = 'The seventh toll rolls over the rooftops, and the unreturned wisps scatter like sparks from a kicked fire. The Hollow goes dark — gently, the way it does everything.';
  $('end-stats').textContent = `Wisps returned: ${state.returned} of 7 · So close, keeper. The night resets; the town remembers nothing but kindness.`;
  $('again-btn').textContent = 'Begin the night again';
  $('end-screen').classList.remove('hidden');
}

/* ---------------- Start / reset ---------------- */
function startGame() {
  newLayout();
  Object.assign(state, {
    mode: 'play', scene: 'well', keeperX: 480, targetX: 480, radius: 165,
    lightX: 480, lightY: 445, lightTX: 480, lightTY: 445, lightFree: false, lightIdle: 0,
    playTime: 0, tolls: 0, nextToll: 60, oil: 100, returned: 0, carried: [],
    hasCrown: false, crownDone: false, metGhosts: {}, sheriffDir: 1
  });
  state.sheriffX = GHOST_SPOTS.sheriff.x;
  stage.classList.remove('lit');
  $('title-screen').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  $('help-screen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  renderScene(); updateHUD(); positionKeeper();
  caption('Well Square — find the wisps. Bring them home to the well.', 3600);
}
$('begin-btn').addEventListener('click', () => { Audio8.init(); startGame(); });
$('again-btn').addEventListener('click', () => { Audio8.init(); startGame(); });
$('mute-btn').addEventListener('click', e => { Audio8.init(); e.target.textContent = Audio8.toggleMute() ? '🔇' : '🔊'; });
$('help-btn').addEventListener('click', () => { if (state.mode === 'play') state.mode = 'help'; $('help-screen').classList.remove('hidden'); });
$('help-close').addEventListener('click', () => { $('help-screen').classList.add('hidden'); if (state.mode === 'help') state.mode = 'play'; });

/* ---------------- Init: the town waits behind the title ---------------- */
state.sheriffX = GHOST_SPOTS.sheriff.x;
newLayout();
renderScene(); updateHUD(); positionKeeper();
requestAnimationFrame(loop);

/* Debug/testing hook (only with ?debug=1) — used by the automated playtest. */
if (new URLSearchParams(location.search).has('debug')) {
  window.GLOAM = {
    state, Audio8,
    get wisps() { return wisps; }, get crown() { return crown; },
    goScene, talkTo, advanceDialogue, startGame, depositWisps,
    setOil(v) { state.oil = v; updateHUD(); },
    setRadius, teleport(x) { state.keeperX = state.targetX = x; positionKeeper(); },
    advanceTime(s) { state.playTime += s; },
    inLight
  };
}
