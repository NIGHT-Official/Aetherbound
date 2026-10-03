import { mulberry32, PUP_CELL, PUP_CENTER_X, PUP_FEET_Y } from "@/game/adventurebound";
import type { Particle } from "@/game/adventurebound";

export type BowlState = 'full' | 'pouring' | 'empty';

export interface Bowl {
  state: BowlState;
  x: number;
  y: number;
  pourTimer: number; // seconds remaining in the eating animation
}

const EATING_DURATION_SEC = 1.5; // matches the old Godot hold time

export function createBowl(x: number, y: number): Bowl {
  return { state: 'empty', x, y, pourTimer: 0 };
}

/** Called by the feed interaction (bag-shake) — the ONLY way a bowl refills. */
export function refillBowl(bowl: Bowl) {
  bowl.state = 'full';
  bowl.pourTimer = 0;
}

/**
 * Called by the pup when it starts eating. Returns false (and does nothing)
 * if the bowl isn't actually full — callers should already be checking
 * bowl.state before this, but this guards against a stale call.
 */
export function startEating(bowl: Bowl): boolean {
  if (bowl.state !== 'full') return false;
  bowl.state = 'pouring';
  bowl.pourTimer = EATING_DURATION_SEC;
  return true;
}

/** Call once per frame. Fires onFinished() the moment eating completes. */
export function tickBowl(bowl: Bowl, dt: number, onFinished: () => void) {
  if (bowl.state !== 'pouring') return;
  bowl.pourTimer -= dt;
  if (bowl.pourTimer <= 0) {
    bowl.state = 'empty';
    bowl.pourTimer = 0;
    onFinished();
  }
}

export const HOME_W = 360;
export const HOME_H = 640;
export const HOME_WORLD_W = 900;

const BOWL_FRAME_W = 15;
const BOWL_FRAME_H = 14;
const BOWL_SCALE = 2;
const HOME_PUP_SCALE = 3;
// pup-eating.png's own native frame size — a smaller art scale than the
// 64x64 idle/walk cells, not a mistake. EAT_SCALE and the y-offset where
// it's drawn are the two knobs to eyeball-tune once you see it on screen.
const EAT_FRAME_W = 24;
const EAT_FRAME_H = 15;
const EAT_SCALE = 3;
const BAG_FRAME_W = 34;
const BAG_FRAME_H = 41;
const BAG_SCALE = 1.2;
const BAG_PARTICLE_CAP = 24;
const BAG_PARTICLE_RATE = 0.04; // seconds between spawns while shaking (~25/sec)
const HEART_PARTICLE_RATE = 0.8; // seconds between hearts while Petting - sparse
const HEART_GROWTH_FRACTION = 0.2; // how much of a heart's life is spent growing to its full size, as 0-1
const FEED_ZOOM = 1.6;          // how far the camera zooms in while a feeding bag exists
const CAMERA_EASE = 6;          // shared ease-speed for both pup-follow and feed-focus panning
const ZOOM_EASE = 5;
const HOME_SAVE_KEY = "aetherbound-home-save";
const HOME_SAVE_VERSION = 4;



function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img); // pixels arrrived: hand image back
    img.onerror = () => reject(new Error(src)); // failed: Report where
    img.src = src; // setting src starts the download
  });
}


export interface PupState {
  x: number;
  y: number;
  hunger: number;          // 0-100
  wanderDir: { x: number; y: number };
  decisionTimer: number;
  facingRight: boolean;    // replaces Godot's flip_h
  anim: 'idle' | 'walk' | 'eating';
  isEating: boolean;
  waitTimer: number;   // seconds spent standing at the wait spot
  gaveUp: boolean;     // true once he's tired of waiting; cleared after he eats
  brushBuffUntil: number;   // epoch ms; 0 or past = no active buff
  brushTier: number;    // 0 = base brush; unused, stub for future market item
  washBuffUntil: number;    // epoch ms
  washCooldownUntil: number;    // epoch ms - separate from washBuffUntil on purpose
}



const SPEED = 60;
const ARRIVE_DIST = 10;
const WAIT_ARRIVE_DIST = 5;

// Fence — PLACEHOLDER, re-measure against the actual home canvas before using
const FENCE = { minX: 40, maxX: HOME_WORLD_W - 40, minY: 323, maxY: 630 };
// Give up wait timer
const WAIT_GIVE_UP_SEC = 10;
// Grooming tuning ------------------------------------------------------
const BRUSH_BASE_DURATION_MS = 90 * 60_000; // 90 min, still tuning
const BRUSH_TIER_BONUS_MS = 0; // stub: future brush tiers add time here
const WASH_BUFF_DURATION_MS = 12 * 3600_000; // 12h
const WASH_COOLDOWN_MS = 24 * 3600_000; // 24h, deliberately different


export function createPup(x: number, y: number): PupState {
  return {
    x, y,
    hunger: 100,
    wanderDir: { x: 0, y: 0 },
    decisionTimer: 0,
    facingRight: true,
    anim: 'idle',
    isEating: false,
    waitTimer: 0,   // seconds spent standing at the wait spot
    gaveUp: false,     // true once he's tired of waiting; cleared after he eats
    brushBuffUntil: 0,
    brushTier: 0,
    washBuffUntil: 0,
    washCooldownUntil: 0,
  };
}

export function canBrush(pup: PupState): boolean {
  return Date.now() >= pup.brushBuffUntil;
}

export function applyBrushBuff(pup: PupState) {
  const durationMs = BRUSH_BASE_DURATION_MS + pup.brushTier * BRUSH_TIER_BONUS_MS;
  pup.brushBuffUntil = Date.now() + durationMs;
}

export function canWash(pup: PupState, soapCount: number): boolean {
  return soapCount > 0 && Date.now() >= pup.washCooldownUntil;
}

export function applyWashBuff(pup: PupState) {
  pup.washBuffUntil = Date.now() + WASH_BUFF_DURATION_MS;
  pup.washCooldownUntil = Date.now() + WASH_COOLDOWN_MS;
}

/**
 * Call once per frame. `bowl` is read-only here except for the one
 * startEating() call — the bowl's own tickBowl() (called separately,
 * see below) is what actually finishes eating and resets hunger.
 */
/**
 * `hungry` is decided OUTSIDE this function — see HomeSim.tick(), which
 * derives it from the SAME "Well Fed" energy-regen buff timer that boosts
 * Adventure energy regen. Food is unlimited right now, so that buff's
 * duration IS the cooldown: hungry = !wellFed. `pup.hunger` itself is kept
 * only as a 0/100 cosmetic mirror of that boolean, for a future hunger
 * meter — nothing reads it to decide behavior anymore.
 */
export function updatePup(pup: PupState, bowl: Bowl, dt: number, hungry: boolean) {
  if (pup.isEating) {
    // Waiting on the bowl's own pour timer — see onPupFinishedEating below
    pup.anim = 'eating';
    return;
  }
  // A FIXED spot near the bowl, not the bowl's own x/y — so the snout lines
  // up the same way every time regardless of which direction he wandered in
  // from. Tune these two offsets by eye if the alignment looks off.
  const eatSpot = { x: bowl.x - 14, y: bowl.y - 2 };
  const waitSpot = { x: bowl.x - 30, y: bowl.y - 5 };

  pup.decisionTimer -= dt;
  pup.hunger = hungry ? 0 : 100;

  // Pup only ever checks the bowl when it's actually hungry —
  // deliberate design call so it doesn't loiter at an empty bowl otherwise.
  if (hungry) {
    if (bowl.state === 'full') {
      // 1. A full bowl always wins, even if he'd given up. Head for the
      // fixed eat spot, not the bowl's raw x/y, so the approach always ends
      // with the same alignment no matter which side he wandered in from.
      moveToward(pup, eatSpot, dt);
      if (dist(pup, eatSpot) < ARRIVE_DIST) {
        if (startEating(bowl)) {
          pup.isEating = true;
          pup.x = eatSpot.x; // snap exactly onto the spot — no leftover approach-angle drift
          pup.y = eatSpot.y;
          pup.facingRight = true; // eat spot sits left of the bowl, so face right toward it
          pup.anim = 'eating';
        }
      } else {
        pup.anim = 'walk';
      }
    } else if (pup.gaveUp) {
      // 2. Gave up and the bowl isn't full: ignore it and wander
      wander(pup, dt);
    } else {
      // 3. Go to the wait spot and wait
      const d = dist(pup, waitSpot);
      if (d >= WAIT_ARRIVE_DIST) {
        moveToward(pup, waitSpot, dt);
        pup.anim = 'walk';
      } else {
        pup.wanderDir = { x: 0, y: 0 };
        pup.anim = 'idle';
        pup.facingRight = true;
        pup.waitTimer += dt;
        if (pup.waitTimer >= WAIT_GIVE_UP_SEC) {
          pup.gaveUp = true;
          pup.waitTimer = 0;
          pickNewWanderState(pup);   // so he starts moving instead of standing frozen
        }
      }
    }
  } else {
    wander(pup, dt);
  }
}


function wander(pup: PupState, dt: number) {
  if (pup.decisionTimer <= 0) pickNewWanderState(pup);
  pup.anim = (pup.wanderDir.x === 0 && pup.wanderDir.y === 0) ? 'idle' : 'walk';
  pup.x += pup.wanderDir.x * SPEED * dt;
  pup.y += pup.wanderDir.y * SPEED * dt;
  applyFence(pup);
  updateFacing(pup);
}


/**
 * Call this from wherever you tick the Bowl (bowl.ts's tickBowl onFinished
 * callback) so the pup knows to stop eating and reset hunger.
 */
export function onPupFinishedEating(pup: PupState) {
  pup.hunger = 100;
  pup.isEating = false;
  pup.anim = 'idle';
  pup.gaveUp = false;
  pup.waitTimer = 0;
  pickNewWanderState(pup);
}

function moveToward(pup: PupState, target: { x: number; y: number }, dt: number) {
  const dx = target.x - pup.x;
  const dy = target.y - pup.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return;
  pup.wanderDir = { x: dx / d, y: dy / d };
  pup.x += pup.wanderDir.x * SPEED * dt;
  pup.y += pup.wanderDir.y * SPEED * dt;
  if (dx < 0) pup.facingRight = false;
  else if (dx > 0) pup.facingRight = true;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function applyFence(pup: PupState) {
  if (pup.x > FENCE.maxX) { pup.x = FENCE.maxX; pup.wanderDir.x = -0.5; }
  if (pup.x < FENCE.minX) { pup.x = FENCE.minX; pup.wanderDir.x = 0.5; }
  if (pup.y > FENCE.maxY) { pup.y = FENCE.maxY; pup.wanderDir.y = -0.5; }
  if (pup.y < FENCE.minY) { pup.y = FENCE.minY; pup.wanderDir.y = 0.5; }
}

function updateFacing(pup: PupState) {
  if (pup.wanderDir.x < 0) pup.facingRight = false;
  else if (pup.wanderDir.x > 0) pup.facingRight = true;
}

function pickNewWanderState(pup: PupState) {
  pup.decisionTimer = 1 + Math.random() * 2; // 1-3s, matches old randf_range
  if (Math.random() > 0.4) {
    const angle = Math.random() * Math.PI * 2;
    pup.wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
  } else {
    pup.wanderDir = { x: 0, y: 0 };
  }
}

export interface FoodBagState {
  x: number;
  y: number;
  rotationDegrees: number;
  isShaking: boolean;
  shakeTimer: number;
  targetTime: number;
  particlesEmitting: boolean;
}

export interface BrushToolState {
  x: number;
  y: number;
  isBrushing: boolean;
  strokeTimer: number;
  targetTime: number;
}

const SHAKE_VELOCITY_THRESHOLD = 100; // px/sec, matches the old Godot threshold
const TARGET_SHAKE_TIME = 2.0;        // seconds of actual shaking needed to finish

const BRUSH_VELOCITY_THRESHOLD = 60; // px/sec - gentler than food bag shake, since brushing is a more delicate motion
const BRUSH_TARGET_TIME = 1.5;        // seconds of actual brushing needed to finish


export function createFoodBag(x: number, y: number): FoodBagState {
  return {
    x, y,
    rotationDegrees: -90,
    isShaking: false,
    shakeTimer: 0,
    targetTime: TARGET_SHAKE_TIME,
    particlesEmitting: false,
  };
}

export function createBrushTool(x: number, y: number): BrushToolState {
  return {
    x, y,
    isBrushing: false,
    strokeTimer: 0,
    targetTime: BRUSH_TARGET_TIME
  };
}

export function updateBrushTool(
  tool: BrushToolState,
  pointerDown: boolean,
  pointerX: number,
  pointerY: number,
  deltaTime: number,
  elapsedMs: number,
  lastPointer: { x: number; y: number; t: number },
  onComplete: () => void
): boolean {
  if (pointerDown) {
    // Follow the pointer
    tool.x = pointerX;
    tool.y = pointerY;

    // Manual velocity calc (Godot did this for free)
    const dx = pointerX - lastPointer.x;
    const dy = pointerY - lastPointer.y;
    const dt = Math.max(elapsedMs - lastPointer.t, 1); // avoid divide-by-zero
    const velocity = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);

    tool.isBrushing = velocity > BRUSH_VELOCITY_THRESHOLD;
    if (tool.isBrushing) tool.strokeTimer += deltaTime;
  } else {
    tool.isBrushing = false;
  }
  if (tool.strokeTimer >= tool.targetTime) {
    onComplete();
    return true; // caller removes this tool from its entity list
  }
  return false;
}

/**
 * Call once per frame while the bag exists.
 * `lastMouse` must persist across frames (owned by whatever tracks pointer
 * input) — Godot's get_last_mouse_velocity() has no direct equivalent, so
 * velocity is computed here from the previous position + timestamp.
 * Returns true when the bag should be removed (feeding finished).
 */
export function updateFoodBag(
  bag: FoodBagState,
  bowl: Bowl,
  pointerDown: boolean,
  pointerX: number,
  pointerY: number,
  deltaTime: number,
  elapsedMs: number,
  lastPointer: { x: number; y: number; t: number },
  onFeedingComplete?: () => void
): boolean {

  if (pointerDown) {
    // Tilt oscillation between -99 and -80 degrees
    const t = (Math.sin(elapsedMs * 0.01) + 1) / 2;
    bag.rotationDegrees = lerp(-99, -80, t);

    // Follow the pointer
    bag.x = pointerX;
    bag.y = pointerY;

    // Manual velocity calc (Godot did this for free)
    const dx = pointerX - lastPointer.x;
    const dy = pointerY - lastPointer.y;
    const dt = Math.max(elapsedMs - lastPointer.t, 1); // avoid divide-by-zero
    const velocity = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);

    if (velocity > SHAKE_VELOCITY_THRESHOLD) {
      bag.isShaking = true;
      bag.shakeTimer += deltaTime;
      bag.particlesEmitting = true;
    } else {
      bag.isShaking = false;
      bag.particlesEmitting = false;
    }
  } else {
    bag.isShaking = false;
    bag.particlesEmitting = false;
  }

  if (bag.shakeTimer >= bag.targetTime) {
    refillBowl(bowl);
    onFeedingComplete?.();
    return true; // caller removes this bag from its entity list
  }
  return false;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
//-------------------------------------------------------------------

export type WallStyle = 'indigo' | 'sage';
export type FloorStyle = 'walnut-plank' | 'ash-plank';
export type TrimStyle = 'white' | 'dark-wood';

export interface HomeStyle {
  wall: WallStyle;
  floor: FloorStyle;
  trim: TrimStyle;
  windowFrame: WindowFrameStyle;
  outside: OutsideStyle;
}

// Split point and trim height as fractions of HOME_H, not fixed pixels —
// "canvas size" here means the 360x640 ROOM space (HOME_W/HOME_H), not the
// real on-screen pixel canvas. home-screen.tsx already transforms room space
// to actual pixels before draw() ever runs, so drawing code never touches
// device pixels or DPR directly.
const WALL_SPLIT_RATIO = 300 / 640; // preserves the original art's wall/floor line
const TRIM_HEIGHT_RATIO = 12 / 640;

function wallSplitY(): number {
  return Math.round(HOME_H * WALL_SPLIT_RATIO);
}

function trimHeight(): number {
  return Math.round(Math.min(14, Math.max(10, HOME_H * TRIM_HEIGHT_RATIO)));
}

const WALL_COLORS: Record<WallStyle, string> = {
  indigo: '#241266',
  sage: '#2f3b2a',
};

// Two colors per floor style, kept close together on purpose — per-plank
// jitter (see drawPlank) supplies the visual interest, not big color bands.
const FLOOR_PALETTES: Record<FloorStyle, [string, string]> = {
  'walnut-plank': ['#3a2415', '#2f1d10'],
  'ash-plank': ['#5c5044', '#4c4239'],
};

const TRIM_COLORS: Record<TrimStyle, { highlight: string; body: string; shadow: string }> = {
  white: { highlight: '#ffffff', body: '#e8e4da', shadow: '#a8a396' },
  'dark-wood': { highlight: '#5c4530', body: '#3a2a1c', shadow: '#221810' },
};

// --- Small color-math helpers (no library — a few lines is cheaper) --------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** amt in [-1, 1]: negative darkens toward black, positive lightens toward white. */
function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (ch: number) => ch + (amt > 0 ? 255 - ch : ch) * amt;
  return rgbToHex(mix(r), mix(g), mix(b));
}

function blend(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Turns a style name into a stable RNG seed, so the same style always looks the same. */
function hashStyle(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

// --- Floor texture: built once per style, cached, drawn scaled-up ----------

const FLOOR_PIXEL_SCALE = 3; // render at 1/3 resolution, scale up crisply → chunky pixel-art planks
const PLANK_ROW_H = 6;       // low-res px per plank row
const PLANK_W = 20;

function drawPlank(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  palette: [string, string], rng: () => number
) {
  if (w <= 0 || h <= 0) return;
  const [colorA, colorB] = palette;
  const base = rng() < 0.5 ? colorA : colorB;
  const plankColor = shade(base, (rng() - 0.5) * 0.08); // ±4% lightness jitter

  ctx.fillStyle = plankColor;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = shade(plankColor, 0.18);   // top highlight
  ctx.fillRect(x, y, w, 1);

  ctx.fillStyle = shade(plankColor, -0.25);  // seam: right edge + bottom edge
  ctx.fillRect(x + w - 1, y, 1, h);
  ctx.fillRect(x, y + h - 1, w, 1);

  if (w > 3 && rng() < 0.35) {                // sparse grain streak
    const gx = x + 1 + Math.floor(rng() * (w - 2));
    const gLen = Math.min(h - 2, 1 + Math.floor(rng() * 2));
    ctx.fillStyle = shade(plankColor, -0.12);
    ctx.fillRect(gx, y + 1, 1, Math.max(1, gLen));
  }
  if (w > 5 && rng() < 0.03) {                       // rarer than before (8% → 3%)
    const knotSize = 2 + Math.floor(rng());       // 2-3 low-res px
    const kx = x + 1 + Math.floor(rng() * Math.max(1, w - knotSize - 1));
    const ky = y + Math.max(0, Math.floor((h - knotSize) / 2));
    ctx.fillStyle = shade(plankColor, -0.3);
    ctx.fillRect(kx, ky, knotSize, knotSize);
  }

}

function applyWallShadow(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const shadowH = Math.max(2, Math.round(h * 0.12));
  const grad = ctx.createLinearGradient(0, 0, 0, shadowH);
  grad.addColorStop(0, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, shadowH);
}

function buildFloorTexture(style: FloorStyle, lowW: number, lowH: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = lowW;
  canvas.height = lowH;
  const tctx = canvas.getContext('2d');
  if (!tctx) return canvas; // extremely unlikely; drawImage of a blank canvas is a harmless no-op

  const palette = FLOOR_PALETTES[style];
  const rng = mulberry32(hashStyle(style)); // same seed every load → same floor every load

  tctx.fillStyle = blend(palette[0], palette[1], 0.5);
  tctx.fillRect(0, 0, lowW, lowH);

  for (let rowY = 0, row = 0; rowY < lowH; rowY += PLANK_ROW_H, row++) {
    const rowH = Math.min(PLANK_ROW_H, lowH - rowY);
    let x = row % 2 === 0 ? 0 : -Math.floor(PLANK_W / 2); // stagger = brick coursing
    while (x < lowW) {
      const plankW = PLANK_W;
      const segStart = Math.max(x, 0);
      const segEnd = Math.min(x + plankW, lowW);
      if (segEnd > segStart) drawPlank(tctx, segStart, rowY, segEnd - segStart, rowH, palette, rng);
      x += plankW;
    }
  }

  applyWallShadow(tctx, lowW, lowH);
  return canvas;
}

let floorCache: { style: FloorStyle; width: number; height: number; canvas: HTMLCanvasElement } | null = null;

function getFloorTexture(style: FloorStyle, floorH: number): HTMLCanvasElement {
  const lowW = Math.ceil(HOME_W / FLOOR_PIXEL_SCALE);
  const lowH = Math.ceil(floorH / FLOOR_PIXEL_SCALE);
  if (floorCache && floorCache.style === style && floorCache.width === lowW && floorCache.height === lowH) {
    return floorCache.canvas;
  }
  const canvas = buildFloorTexture(style, lowW, lowH);
  floorCache = { style, width: lowW, height: lowH, canvas };
  return canvas;
}

// --- The three draw functions ----------------------------------------------

function drawWall(ctx: CanvasRenderingContext2D, style: WallStyle, splitY: number) {
  ctx.fillStyle = WALL_COLORS[style];
  ctx.fillRect(0, 0, HOME_WORLD_W, splitY);
}

function drawFloor(ctx: CanvasRenderingContext2D, style: FloorStyle, splitY: number) {
  const floorH = HOME_H - splitY;
  const texture = getFloorTexture(style, floorH);
  ctx.imageSmoothingEnabled = false; // keep the low-res texture crisp when scaled up
  ctx.drawImage(texture, 0, splitY, HOME_WORLD_W, floorH);
}

function drawTrim(ctx: CanvasRenderingContext2D, style: TrimStyle, splitY: number, height: number) {
  const c = TRIM_COLORS[style];
  ctx.fillStyle = c.highlight;
  ctx.fillRect(0, splitY, HOME_WORLD_W, 1);
  ctx.fillStyle = c.body;
  ctx.fillRect(0, splitY + 1, HOME_WORLD_W, height - 2);
  ctx.fillStyle = c.shadow;
  ctx.fillRect(0, splitY + height - 1, HOME_WORLD_W, 1);

  const grad = ctx.createLinearGradient(0, splitY + height, 0, splitY + height + 3);
  grad.addColorStop(0, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, splitY + height, HOME_W, 3);
}

// --- Window: frame reuses trim's two looks; the "outside" is a separate scene ---

export type WindowFrameStyle = TrimStyle; // same two looks as the baseboard, for now — split later if they diverge
export type OutsideStyle = 'day' | 'night';

const WINDOW_FRAME_COLORS: Record<WindowFrameStyle, { highlight: string; body: string; shadow: string }> = TRIM_COLORS;

const OUTSIDE_SKY: Record<OutsideStyle, { top: string; bottom: string; ground: string }> = {
  day: { top: '#6fb7e8', bottom: '#cdeaff', ground: '#4a8f3c' },
  night: { top: '#0b1030', bottom: '#1c2454', ground: '#152016' },
};

export interface WindowPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DoorPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

function buildOutsideTexture(style: OutsideStyle, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const octx = canvas.getContext('2d');
  if (!octx) return canvas;
  const sky = OUTSIDE_SKY[style];

  const grad = octx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, sky.top);
  grad.addColorStop(1, sky.bottom);
  octx.fillStyle = grad;
  octx.fillRect(0, 0, w, h);

  const groundH = Math.round(h * 0.25);
  octx.fillStyle = sky.ground;
  octx.fillRect(0, h - groundH, w, groundH);

  return canvas;
}

let outsideCache: { style: OutsideStyle; width: number; height: number; canvas: HTMLCanvasElement } | null = null;

function getOutsideTexture(style: OutsideStyle, w: number, h: number): HTMLCanvasElement {
  if (outsideCache && outsideCache.style === style && outsideCache.width === w && outsideCache.height === h) {
    return outsideCache.canvas;
  }
  const canvas = buildOutsideTexture(style, w, h);
  outsideCache = { style, width: w, height: h, canvas };
  return canvas;
}

const HEART_PIXELS = [
  '.#.#.',
  '#####',
  '#####',
  '.###.',
  '..#..',
];

function drawPixelHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const cols = HEART_PIXELS[0].length;
  const rows = HEART_PIXELS.length;
  const cell = size / cols;
  ctx.fillStyle = color;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (HEART_PIXELS[row][col] !== '#') continue;
      ctx.fillRect(x - size / 2 + col * cell, y - size / 2 + row * cell, cell, cell);
    }
  }
}


function drawDoor(ctx: CanvasRenderingContext2D, placement: DoorPlacement) {
  const { x, y, w, h } = placement;
  ctx.fillStyle = '#4a2f1c';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arcTo(x, y, x + w / 2, y, w / 2);
  ctx.arcTo(x + w, y, x + w, y + w / 2, w / 2);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = shade('#4a2f1c', -0.3);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#caa24a'; // handle
  ctx.beginPath();
  ctx.arc(x + w - 12, y + h * 0.55, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  placement: WindowPlacement,
  outsideStyle: OutsideStyle,
  frameStyle: WindowFrameStyle,
  wallW: number,
  wallH: number
) {
  // Same coordinates on both sides = "reveal what's behind the wall right here."
  // Move the window later and this line needs no changes — it'll just reveal
  // a different slice of the same fixed backdrop, exactly like a real window.
  const backdrop = getOutsideTexture(outsideStyle, wallW, wallH);
  ctx.drawImage(
    backdrop,
    placement.x, placement.y, placement.w, placement.h,
    placement.x, placement.y, placement.w, placement.h
  );

  const c = WINDOW_FRAME_COLORS[frameStyle];
  const t = 4; // frame thickness
  ctx.fillStyle = c.body;
  ctx.fillRect(placement.x - t, placement.y - t, placement.w + t * 2, t);             // top
  ctx.fillRect(placement.x - t, placement.y + placement.h, placement.w + t * 2, t);   // bottom
  ctx.fillRect(placement.x - t, placement.y - t, t, placement.h + t * 2);             // left
  ctx.fillRect(placement.x + placement.w, placement.y - t, t, placement.h + t * 2);   // right

  ctx.strokeStyle = c.shadow;
  ctx.strokeRect(placement.x - t, placement.y - t, placement.w + t * 2, placement.h + t * 2);

  // cosmetic muntin cross-bar
  ctx.fillStyle = c.highlight;
  ctx.fillRect(placement.x + placement.w / 2 - 1, placement.y, 2, placement.h);
  ctx.fillRect(placement.x, placement.y + placement.h / 2 - 1, placement.w, 2);
}


export class HomeSim {
  hudDirty = true;
  time = 0;
  bowl = createBowl(250, 325);
  pup = createPup(180, 450);
  bag: FoodBagState | null = null;
  brushTool: BrushToolState | null = null;
  petting = false;
  petCaption = "";
  private readonly PET_CAPTIONS = [
    "Sol leans into your leg.",
    "Sol wags his tail happily.",
    "Sol rolls over for belly rubs.",
    "Sol nuzzles your hand.",
    "Sol's ears perk up at your touch.",
  ];
  soapCount = 3; // Placeholder - until market and inventory
  private particles: Particle[] = [];
  private bagParticleAcc = 0;
  private brushParticleAcc = 0;
  private heartSlotIndex = 0;
  pointer = { down: false, x: 0, y: 0 }
  lastPointer = { x: 0, y: 0, t: 0 }
  style: HomeStyle = { wall: 'indigo', floor: 'walnut-plank', trim: 'white', windowFrame: 'white', outside: 'day' };
  // TODO once the decor editor exists: clamp windowPlacement so it can't be
  // dragged too low into (or past) the floor line — something like
  // `p.y + p.h <= wallSplitY() - MIN_WINDOW_MARGIN`.
  windowPlacement: WindowPlacement = { x: 130, y: 60, w: 100, h: 80 };
  camera = { x: 0, y: 0 };
  cameraFollow = true;
  zoom = 1;
  closeUpTarget: { x: number; y: number } | null = null;
  private zoomTarget = 1;
  private wasCloseUp = false;
  private isPanningCamera = false;
  private wiggleTime = 0;
  private panStartPointerX = 0;
  private panStartCameraX = 0;
  door: DoorPlacement = { x: HOME_WORLD_W - 140, y: wallSplitY() - 148, w: 70, h: 160 };
  onDoorTapped: (() => void) | null = null;
  onPupTapped: (() => void) | null = null;
  onFed: (() => void) | null = null;
  // Set by HomeScreen to `() => Date.now() < game.regenBuffUntil` — lets the
  // pup's hunger gating read the SAME "Well Fed" timer without home.ts ever
  // importing SpiritGame directly (mirrors onFed's direction, reversed).
  isWellFed: (() => boolean) | null = null;

  // Tracks which decor fields the player has explicitly customized (via the
  // future decor editor) vs. which still use the code's built-in defaults.
  // Only customized fields get written to the save — this is what lets a
  // tuned default in code take effect for anyone who never touched that
  // field, instead of an old save re-imposing whatever the default was when
  // it was written. All writes to style/windowPlacement/door must go through
  // their setters, or this tracking silently gets out of sync.
  private customized: {
    wall?: true; floor?: true; trim?: true; windowFrame?: true; outside?: true;
    windowPlacement?: true; door?: true;
  } = {};

  bowlImg: HTMLImageElement | null = null;
  bagImg: HTMLImageElement | null = null;
  eatImg: HTMLImageElement | null = null;
  idleImg: HTMLImageElement | null = null;
  walkImg: HTMLImageElement | null = null;

  constructor() {
    for (let i = 0; i < BAG_PARTICLE_CAP; i++) {
      this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#caa24a', alive: false });
    }
    this.loadSave();
  }

  persistNow() {
    if (typeof window === "undefined") return;
    try {
      // Sparse save: only include a field if the player actually customized
      // it. Anything omitted here means "no opinion" — loadSave() leaves
      // whatever the current code default is, so tuning a default in code
      // takes effect immediately for anyone who never touched that field.
      const style: Partial<HomeStyle> = {};
      if (this.customized.wall) style.wall = this.style.wall;
      if (this.customized.floor) style.floor = this.style.floor;
      if (this.customized.trim) style.trim = this.style.trim;
      if (this.customized.windowFrame) style.windowFrame = this.style.windowFrame;
      if (this.customized.outside) style.outside = this.style.outside;

      // JSON.stringify drops object properties whose value is `undefined`,
      // so windowPlacement/door simply vanish from the saved JSON when not
      // customized — no separate "isCustomized" flag needs to be persisted.
      window.localStorage.setItem(HOME_SAVE_KEY, JSON.stringify({
        v: HOME_SAVE_VERSION,
        style,
        windowPlacement: this.customized.windowPlacement ? this.windowPlacement : undefined,
        door: this.customized.door ? this.door : undefined,
      }));
    } catch {
      /* private browsing etc. — fails silently, same as SpiritGame */
    }
  }

  private loadSave(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(HOME_SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as {
        v?: number; style?: Partial<HomeStyle>;
        windowPlacement?: Partial<WindowPlacement>; door?: Partial<DoorPlacement>;
      };
      if (data.v !== HOME_SAVE_VERSION) return false;
      // A field being present here means a past persistNow() considered it
      // customized (that's the only time it's ever written) — so restoring
      // it must also re-mark it customized, or the next persistNow() would
      // silently drop it for lacking the flag.
      if (data.style?.wall && data.style.wall in WALL_COLORS) {
        this.style.wall = data.style.wall;
        this.customized.wall = true;
      }
      if (data.style?.floor && data.style.floor in FLOOR_PALETTES) {
        this.style.floor = data.style.floor;
        this.customized.floor = true;
      }
      if (data.style?.trim && data.style.trim in TRIM_COLORS) {
        this.style.trim = data.style.trim;
        this.customized.trim = true;
      }
      if (data.style?.windowFrame && data.style.windowFrame in WINDOW_FRAME_COLORS) {
        this.style.windowFrame = data.style.windowFrame;
        this.customized.windowFrame = true;
      }
      if (data.style?.outside && data.style.outside in OUTSIDE_SKY) {
        this.style.outside = data.style.outside;
        this.customized.outside = true;
      }
      const p = data.windowPlacement;
      if (p && typeof p.x === "number" && typeof p.y === "number" && typeof p.w === "number" && typeof p.h === "number") {
        this.windowPlacement = { x: p.x, y: p.y, w: p.w, h: p.h };
        this.customized.windowPlacement = true;
      }
      const d = data.door;
      if (d && typeof d.x === "number" && typeof d.y === "number" && typeof d.w === "number" && typeof d.h === "number") {
        this.door = { x: d.x, y: d.y, w: d.w, h: d.h };
        this.customized.door = true;
      }
      return true;
    } catch {
      return false;
    }
  }

  setWallStyle(style: WallStyle) {
    this.style.wall = style;
    this.customized.wall = true;
    this.hudDirty = true;
    this.persistNow();
  }

  setFloorStyle(style: FloorStyle) {
    this.style.floor = style;
    this.customized.floor = true;
    this.hudDirty = true;
    this.persistNow();
  }

  setTrimStyle(style: TrimStyle) {
    this.style.trim = style;
    this.customized.trim = true;
    this.hudDirty = true;
    this.persistNow();
  }

  setWindowFrameStyle(style: WindowFrameStyle) {
    this.style.windowFrame = style;
    this.customized.windowFrame = true;
    this.hudDirty = true;
    this.persistNow();
  }

  setOutsideStyle(style: OutsideStyle) {
    this.style.outside = style;
    this.customized.outside = true;
    this.hudDirty = true;
    this.persistNow();
  }

  // Live drag-preview (once the decor editor exists) should mutate
  // windowPlacement/door directly, frame by frame, with NO call to these
  // setters — hitting localStorage on every pointer-move would be wasteful
  // and janky. Call these once, on drag-END, to commit the final position.
  setWindowPlacement(p: WindowPlacement) {
    // TODO once the decor editor exists: clamp so it can't be dragged
    // too low into (or past) the floor line — see the field's own TODO above.
    this.windowPlacement = p;
    this.customized.windowPlacement = true;
    this.hudDirty = true;
    this.persistNow();
  }

  setDoorPlacement(d: DoorPlacement) {
    this.door = d;
    this.customized.door = true;
    this.hudDirty = true;
    this.persistNow();
  }

  private clampCameraX(x: number): number {
    return Math.max(0, Math.min(HOME_WORLD_W - HOME_W, x));
  }

  private clampCameraY(y: number): number {
    const maxY = Math.max(0, HOME_H - HOME_H / this.zoom);
    return Math.max(0, Math.min(maxY, y));
  }

  lockCameraToPup() {
    this.cameraFollow = true;
  }

  startBrushing() {
    if (!canBrush(this.pup)) return; // 
    this.brushTool = createBrushTool(this.pup.x, this.pup.y);
    this.pup.anim = 'idle';
  }

  startPetting() {
    this.petting = true;
    this.petCaption = this.PET_CAPTIONS[Math.floor(Math.random() * this.PET_CAPTIONS.length)];
    this.pup.anim = 'idle';
  }

  stopPetting() {
    this.petting = false;
  }


  // Inverse of draw()'s transform (translate(W/2,H/2) → scale(zoom) →
  // translate(-W/2-camera.x, -H/2)). Needed so hit-testing and the bag's
  // "follow the pointer" behavior stay correct while zoomed in during
  // feeding, not just while zoom happens to be 1.
  private toWorld(vx: number, vy: number) {
    return {
      x: (vx - HOME_W / 2) / this.zoom + HOME_W / 2 + this.camera.x,
      y: (vy - HOME_H / 2) / this.zoom + HOME_H / 2 + this.camera.y,
    };
  }

  private spawnParticle(x: number, y: number, opts: { angle: number; speed: number; color: string; life: number; sizeMin?: number; sizeMax?: number; kind?: 'dust' | 'heart' }) {
    for (const p of this.particles) {
      if (p.alive) continue;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(opts.angle) * opts.speed;
      p.vy = Math.sin(opts.angle) * opts.speed;
      const sizeMin = opts.sizeMin ?? 1.5;
      const sizeMax = opts.sizeMax ?? 4;
      const kind = opts.kind ?? 'dust';
      const rolledSize = sizeMin + Math.random() * (sizeMax - sizeMin);
      if (kind === 'heart') {
        p.targetSize = rolledSize;
        p.size = 1; // start small, grow to targetSize over the first half of its life
      } else {
        p.size = rolledSize;
        p.targetSize = rolledSize;
      }
      p.life = opts.life;
      p.max = opts.life;
      p.color = opts.color;
      p.kind = kind;
      return;
    }
  }




  private tickParticles(step: number) {
    if (this.bag?.isShaking) {
      this.bagParticleAcc += step;
      while (this.bagParticleAcc >= BAG_PARTICLE_RATE) {
        this.bagParticleAcc -= BAG_PARTICLE_RATE;
        const bag = this.bag;
        const x = bag.x - BAG_FRAME_H * BAG_SCALE * 0.35;
        const y = bag.y + BAG_FRAME_H * BAG_SCALE * 0.15;
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        const speed = 20 + Math.random() * 30;
        const color = Math.random() < 0.5 ? '#caa24a' : '#8a6a2f';
        this.spawnParticle(x, y, { angle, speed, color, life: 0.5 + Math.random() * 0.4 });
      }
    }

    if (this.brushTool?.isBrushing) {
      this.brushParticleAcc += step;
      while (this.brushParticleAcc >= BAG_PARTICLE_RATE) {
        this.brushParticleAcc -= BAG_PARTICLE_RATE;
        const angle = Math.random() * Math.PI * 2; // light dust, scattering in any direction
        const speed = 10 + Math.random() * 15;
        this.spawnParticle(this.brushTool.x, this.brushTool.y, {
          angle, speed, color: '#d8d6cc', life: 0.3 + Math.random() * 0.2,
        });
      }
    }

    const MAX_HEARTS = 6;
    const HEART_HEAD_OFFSET_X = 25; // roughly where the head sits relative to pup.x, at this sprite scale — nudge by eye
    const HEART_SLOT_OFFSETS = [-18, -6, 6,]

    if (this.petting && this.pointer.down) {
      this.brushParticleAcc += step;
      while (this.brushParticleAcc >= HEART_PARTICLE_RATE) {
        this.brushParticleAcc -= HEART_PARTICLE_RATE;
        let aliveHearts = 0;
        for (const p of this.particles) if (p.alive && p.kind === 'heart') aliveHearts++;
        if (aliveHearts >= MAX_HEARTS) continue;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        const speed = 6 + Math.random() * 6;
        const headX = this.pup.x + (this.pup.facingRight ? HEART_HEAD_OFFSET_X : -HEART_HEAD_OFFSET_X);
        const slotOffset = HEART_SLOT_OFFSETS[this.heartSlotIndex % HEART_SLOT_OFFSETS.length];
        this.heartSlotIndex++;
        const spawnX = headX + slotOffset + (Math.random() - 0.5) * 6;
        const spawnY = this.pup.y - 55 + (Math.random() - 0.5) * 10;

        this.spawnParticle(spawnX, spawnY, {
          angle, speed, color: '#ff6b81', life: 5, sizeMin: 6, sizeMax: 14, kind: 'heart',
        });
      }
    }

    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life -= step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (p.kind !== 'heart') {
        p.vy += 80 * step; // gravity — same constant SpiritGame's particles use
      }
      if (p.kind === 'heart' && p.targetSize !== undefined) {
        const progress = 1 - p.life / p.max;
        const growthProgress = Math.min(1, progress / HEART_GROWTH_FRACTION);
        p.size = 1 + (p.targetSize - 1) * growthProgress;
      }
      if (p.life <= 0) p.alive = false;
    }

  }

  tick(dt: number) {
    const step = Math.min(dt, 0.1); // safety clamp
    this.time += step; // running clock, used for animations

    if (this.bag) {
      this.closeUpTarget = { x: this.bowl.x, y: this.bowl.y };
    } else if (this.brushTool || this.petting) {
      this.closeUpTarget = { x: this.pup.x, y: this.pup.y };
    } else if (this.wasCloseUp) {
      this.closeUpTarget = null;
    }

    if (this.bag) {
      const elapsedMs = this.time * 1000;
      const done = updateFoodBag(
        this.bag, this.bowl, this.pointer.down, this.pointer.x, this.pointer.y,
        step, elapsedMs, this.lastPointer,
        () => { this.hudDirty = true; }
      );
      this.lastPointer = { x: this.pointer.x, y: this.pointer.y, t: elapsedMs };
      if (done) this.bag = null;
    }

    if (this.brushTool) {
      const elapsedMs = this.time * 1000;
      const done = updateBrushTool(
        this.brushTool, this.pointer.down, this.pointer.x, this.pointer.y,
        step, elapsedMs, this.lastPointer,
        () => {
          applyBrushBuff(this.pup);
          this.hudDirty = true;
        }
      );
      this.lastPointer = { x: this.pointer.x, y: this.pointer.y, t: elapsedMs };
      if (done) this.brushTool = null;
    }

    this.tickParticles(step);

    const hungry = !(this.isWellFed?.() ?? false); // no wiring yet (isWellFed null) → treat as hungry, same as before
    if (!this.brushTool && !this.petting) {
      updatePup(this.pup, this.bowl, step, hungry);
    }

    const closeUp = this.closeUpTarget !== null;
    if (this.wasCloseUp && !closeUp) this.cameraFollow = true;
    this.wasCloseUp = closeUp;

    this.zoomTarget = closeUp ? FEED_ZOOM : 1;
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, ZOOM_EASE * step);

    if (closeUp && this.closeUpTarget) {
      const targetX = this.clampCameraX(this.closeUpTarget.x - HOME_W / 2);
      const targetY = this.clampCameraY(this.closeUpTarget.y - HOME_H / 2);
      this.camera.x += (targetX - this.camera.x) * Math.min(1, CAMERA_EASE * step);
      this.camera.y += (targetY - this.camera.y) * Math.min(1, CAMERA_EASE * step);
    } else {
      this.camera.y += (0 - this.camera.y) * Math.min(1, CAMERA_EASE * step); // normal view never pans vertically
      if (this.cameraFollow) {
        const targetX = this.clampCameraX(this.pup.x - HOME_W / 2);
        this.camera.x += (targetX - this.camera.x) * Math.min(1, CAMERA_EASE * step);
      }
    }

    tickBowl(this.bowl, step, () => {
      onPupFinishedEating(this.pup);   // hunger = 100, isEating = false, back to wandering
      this.onFed?.();
      this.hudDirty = true;
    });
  }

  private hitBowl(x: number, y: number) {
    const pad = 20;                       // the bowl is tiny and fingers are big
    const w = BOWL_FRAME_W * BOWL_SCALE;
    const h = BOWL_FRAME_H * BOWL_SCALE;
    return (
      x >= this.bowl.x - w / 2 - pad && x <= this.bowl.x + w / 2 + pad &&
      y >= this.bowl.y - h - pad && y <= this.bowl.y + pad
    );
  }

  private hitDoor(x: number, y: number) {
    return x >= this.door.x && x <= this.door.x + this.door.w && y >= this.door.y && y <= this.door.y + this.door.h;
  }

  private hitPup(x: number, y: number) {
    const halfW = 30;    // roughly the pup's real body width, not the whole sprite cell
    const headroom = 50; // how far above his feet (pup.y) the box reaches
    const pad = 10;
    return (
      x >= this.pup.x - halfW - pad && x <= this.pup.x + halfW + pad &&
      y >= this.pup.y - headroom - pad && y <= this.pup.y + pad
    );
  }


  pointerDown(x: number, y: number) {
    const { x: wx, y: wy } = this.toWorld(x, y); // viewport → world, at this one boundary

    if (this.hitDoor(wx, wy)) {
      this.onDoorTapped?.();
      return;
    }

    if (this.brushTool || this.petting) {
      this.pointer = { down: true, x: wx, y: wy };
      this.lastPointer = { x: wx, y: wy, t: this.time * 1000 };
      return;
    }

    if (this.petting) {
      if (this.hitPup(wx, wy)) {
        this.pointer = { down: true, x: wx, y: wy };
      } else {
        this.stopPetting(); // tapped away from him — that's how you leave petting mode now
      }
      return;
    }


    const grabbing = this.bag
      ? Math.hypot(wx - this.bag.x, wy - this.bag.y) < 50 || this.hitBowl(wx, wy)
      : this.bowl.state === 'empty' && this.hitBowl(wx, wy);

    if (grabbing) {
      this.pointer = { down: true, x: wx, y: wy };
      if (!this.bag) this.bag = createFoodBag(wx, wy);
      this.lastPointer = { x: wx, y: wy, t: this.time * 1000 };
      return;
    }

    if (!this.bag && this.hitPup(wx, wy)) {
      this.onPupTapped?.();
      return;
    }

    // Neither the door nor the bowl/bag: start panning instead.
    this.isPanningCamera = true;
    this.cameraFollow = false; // manual control until "lock" is tapped
    this.panStartPointerX = x; // viewport-space — camera.x is about to move, world-space would drift
    this.panStartCameraX = this.camera.x;
  }

  pointerMove(x: number, y: number) {
    if (this.isPanningCamera) {
      const dx = (x - this.panStartPointerX) / this.zoom; // screen delta → world delta
      this.camera.x = this.clampCameraX(this.panStartCameraX - dx);
      return;
    }
    const w = this.toWorld(x, y);
    this.pointer.x = w.x;
    this.pointer.y = w.y;
  }

  pointerUp() {
    this.isPanningCamera = false;
    this.pointer.down = false;
  }

  loadSprites() {
    return Promise.all([
      loadImage("/sprites/bowl.png"),
      loadImage("/sprites/food-bag.png"),
      loadImage("/sprites/pup-eating.png"),
      loadImage("/sprites/pup-idle.png"),
      loadImage("/sprites/pup-walk.png"),
    ]).then(([bowl, bag, eat, idle, walk]) => {
      this.bowlImg = bowl;
      this.bagImg = bag;
      this.eatImg = eat;
      this.idleImg = idle;
      this.walkImg = walk;
      this.hudDirty = true;
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false; // keeps pixel art crisp
    ctx.save();
    // translate → scale → translate: zooms around the viewport's own screen
    // center. At zoom=1 this reduces exactly to the old translate(-camera.x, 0),
    // so nothing about normal (non-feeding) panning changes.
    ctx.translate(HOME_W / 2, HOME_H / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-HOME_W / 2 - this.camera.x, -HOME_H / 2 - this.camera.y);

    const splitY = wallSplitY();
    drawWall(ctx, this.style.wall, splitY);
    drawFloor(ctx, this.style.floor, splitY);
    drawWindow(ctx, this.windowPlacement, this.style.outside, this.style.windowFrame, HOME_WORLD_W, splitY);
    drawTrim(ctx, this.style.trim, splitY, trimHeight());
    drawDoor(ctx, this.door);



    if (this.bowlImg) {
      const frame =
        this.bowl.state === 'full' ? 0 :
          this.bowl.state === 'pouring' ? 1 : 2;
      const dw = BOWL_FRAME_W * BOWL_SCALE;
      const dh = BOWL_FRAME_H * BOWL_SCALE;
      ctx.drawImage(
        this.bowlImg,
        frame * BOWL_FRAME_W, 0, BOWL_FRAME_W, BOWL_FRAME_H, // source 
        this.bowl.x - dw / 2, this.bowl.y - dh, dw, dh // destination
      );
    }

    const pup = this.pup;
    if (pup.anim === 'eating' && this.eatImg) {
      // pup-eating.png is 4 frames of 24x15 — a different native resolution
      // than the 64x64 idle/walk cells, so it needs its own frame math
      // rather than reusing PUP_CELL/PUP_CENTER_X/PUP_FEET_Y. The y-offset
      // below (edh / 2) and EAT_SCALE are the two knobs to eyeball-tune.
      const eatFrames = 4;
      const eatFps = 6;
      const eatFrame = Math.floor(this.time * eatFps) % eatFrames;
      const edw = EAT_FRAME_W * EAT_SCALE;
      const edh = EAT_FRAME_H * EAT_SCALE;
      ctx.save();
      ctx.translate(pup.x, pup.y - edh / 2);
      if (pup.facingRight) ctx.scale(-1, 1);
      if (this.petting) ctx.rotate(Math.sin(this.wiggleTime * 12) * 0.08);
      ctx.drawImage(this.eatImg, eatFrame * EAT_FRAME_W, 0, EAT_FRAME_W, EAT_FRAME_H, -edw / 2, -edh / 2, edw, edh);
      ctx.restore();
    } else {
      const walking = pup.anim === 'walk';
      const sheet = walking ? this.walkImg : this.idleImg;
      if (sheet) {
        const frames = walking ? 4 : 12;
        const fps = walking ? 8 : 6;
        const frame = Math.floor(this.time * fps) % frames;
        const dw = PUP_CELL * HOME_PUP_SCALE;
        const dx = pup.x - PUP_CENTER_X * HOME_PUP_SCALE;
        const dy = pup.y - PUP_FEET_Y * HOME_PUP_SCALE;
        ctx.save();
        ctx.translate(dx + dw / 2, dy + dw / 2); // move the origin to the pup's center
        if (pup.facingRight) ctx.scale(-1, 1); // mirror horizontally if facing left
        ctx.drawImage(sheet, frame * PUP_CELL, 0, PUP_CELL, PUP_CELL, -dw / 2, -dw / 2, dw, dw);
        ctx.restore(); // undo flip so the bowl and bag aren't mirrored
      }
    }

    if (this.bagImg && this.bag) {
      const bag = this.bag;
      const frame = bag.isShaking ? Math.floor(this.time * 4) % 2 : 0;
      const dw = BAG_FRAME_W * BAG_SCALE;
      const dh = BAG_FRAME_H * BAG_SCALE;

      ctx.save();
      ctx.translate(bag.x, bag.y);                          // rotate around the bag's own point
      ctx.rotate((bag.rotationDegrees * Math.PI) / 180);     // canvas rotation is radians, the state is degrees
      ctx.drawImage(
        this.bagImg,
        frame * BAG_FRAME_W, 0, BAG_FRAME_W, BAG_FRAME_H,    // source: which of the 2 frames
        -dw / 2, -dh / 2, dw, dh                              // destination: centered on the origin we translated to
      );
      ctx.restore();
    }

    for (const p of this.particles) {
      if (!p.alive) continue;
      if (p.kind === 'heart') {
        const progress = 1 - p.life / p.max;
        // fully solid while growing; only fades during the remaining time AFTER it's full-size
        const fadeProgress = progress <= HEART_GROWTH_FRACTION ? 0 : (progress - HEART_GROWTH_FRACTION) / (1 - HEART_GROWTH_FRACTION);
        ctx.globalAlpha = Math.max(0, 1 - fadeProgress);
        drawPixelHeart(ctx, p.x, p.y, p.size, p.color);
      } else {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;



    const DEBUG = false;  // Delete later
    if (DEBUG) {
      ctx.strokeStyle = "red";
      ctx.strokeRect(FENCE.minX, FENCE.minY, FENCE.maxX - FENCE.minX, FENCE.maxY - FENCE.minY);
      ctx.fillStyle = "yellow";
      ctx.fillRect(this.bowl.x - 2, this.bowl.y - 2, 4, 4);
    }

    ctx.restore();

  }

}

