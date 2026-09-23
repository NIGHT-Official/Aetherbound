import { PUP_CELL, PUP_CENTER_X, PUP_FEET_Y } from "@/game/adventurebound";

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

const BOWL_FRAME_W = 15;
const BOWL_FRAME_H = 14;
const BOWL_SCALE = 2;
const HOME_PUP_SCALE = 3;
const BAG_FRAME_W = 34;
const BAG_FRAME_H = 41;
const BAG_SCALE = 1.2;


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
}



const SPEED = 60;
const HUNGER_DECAY_PER_SEC = 3;
const HUNGRY_THRESHOLD = 30;
const ARRIVE_DIST = 10;
const WAIT_ARRIVE_DIST = 5;

// Fence — PLACEHOLDER, re-measure against the actual home canvas before using
const FENCE = { minX: 45, maxX: 335, minY: 323, maxY: 630 };
// Give up wait timer
const WAIT_GIVE_UP_SEC = 10;


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
    gaveUp: false     // true once he's tired of waiting; cleared after he eats
  };
}

/**
 * Call once per frame. `bowl` is read-only here except for the one
 * startEating() call — the bowl's own tickBowl() (called separately,
 * see below) is what actually finishes eating and resets hunger.
 */
export function updatePup(pup: PupState, bowl: Bowl, dt: number) {
  if (pup.isEating) {
    // Waiting on the bowl's own pour timer — see onPupFinishedEating below
    pup.anim = 'eating';
    return;
  }
  const bowlPos = { x: bowl.x, y: bowl.y };
  const waitSpot = { x: bowl.x - 30, y: bowl.y - 5 };

  pup.decisionTimer -= dt;
  pup.hunger = Math.max(0, pup.hunger - HUNGER_DECAY_PER_SEC * dt);

  // Pup only ever checks the bowl when it's actually hungry —
  // deliberate design call so it doesn't loiter at an empty bowl otherwise.
  if (pup.hunger < HUNGRY_THRESHOLD) {
    if (bowl.state === 'full') {
      // 1. A full bowl always wins, even if he'd given up
      moveToward(pup, bowlPos, dt);
      if (dist(pup, bowlPos) < ARRIVE_DIST) {
        if (startEating(bowl)) {
          pup.isEating = true;
          pup.x = bowlPos.x - 5;
          pup.facingRight = true;
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

const SHAKE_VELOCITY_THRESHOLD = 100; // px/sec, matches the old Godot threshold
const TARGET_SHAKE_TIME = 2.0;        // seconds of actual shaking needed to finish

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

export class HomeSim {
  hudDirty = true;
  time = 0;
  bowl = createBowl(250, 325);
  pup = createPup(180, 450);
  bag: FoodBagState | null = null;
  pointer = { down: false, x: 0, y: 0 }
  lastPointer = { x: 0, y: 0, t: 0 }

  bgImg: HTMLImageElement | null = null;
  bowlImg: HTMLImageElement | null = null;
  bagImg: HTMLImageElement | null = null;
  eatImg: HTMLImageElement | null = null;
  idleImg: HTMLImageElement | null = null;
  walkImg: HTMLImageElement | null = null;

  tick(dt: number) {
    const step = Math.min(dt, 0.1); // safety clamp
    this.time += step; // running clock, used for animations

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

    updatePup(this.pup, this.bowl, step);
    tickBowl(this.bowl, step, () => {
      onPupFinishedEating(this.pup);   // hunger = 100, isEating = false, back to wandering
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

  pointerDown(x: number, y: number) {
    // With a bag out: grab it again by pressing near it (or near the bowl).
    // With no bag: only a press on an EMPTY bowl starts one.
    const grabbing = this.bag
      ? Math.hypot(x - this.bag.x, y - this.bag.y) < 50 || this.hitBowl(x, y)
      : this.bowl.state === 'empty' && this.hitBowl(x, y);
    if (!grabbing) return;

    this.pointer = { down: true, x, y };
    if (!this.bag) this.bag = createFoodBag(x, y);
    this.lastPointer = { x, y, t: this.time * 1000 };  // avoid a velocity spike on the first frame
  }

  pointerMove(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  pointerUp() {
    this.pointer.down = false;   // the bag stays where it is; progress is kept
  }


  loadSprites() {
    return Promise.all([
      loadImage("/sprites/home-bg.png"),
      loadImage("/sprites/bowl.png"),
      loadImage("/sprites/food-bag.png"),
      loadImage("/sprites/pup-eating.png"),
      loadImage("/sprites/pup-idle.png"),
      loadImage("/sprites/pup-walk.png"),
    ]).then(([bg, bowl, bag, eat, idle, walk]) => {
      this.bgImg = bg;
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

    if (this.bgImg) ctx.drawImage(this.bgImg, 0, 0, HOME_W, HOME_H);

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
    const walking = pup.anim === 'walk';
    const sheet = walking ? this.walkImg : this.idleImg; // 'eating' uses idle until the sheet is reformatted
    if (!sheet) return;
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


    const DEBUG = false;  // Delete later
    if (DEBUG) {
      ctx.strokeStyle = "red";
      ctx.strokeRect(FENCE.minX, FENCE.minY, FENCE.maxX - FENCE.minX, FENCE.maxY - FENCE.minY);
      ctx.fillStyle = "yellow";
      ctx.fillRect(this.bowl.x - 2, this.bowl.y - 2, 4, 4);
    }

  }

}

