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
const BOWL_SCALE = 3;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img); // pixels arrrived: hand image back
    img.onerror = () => reject(new Error(src)); // failed: Report where
    img.src = src; // setting src starts the download
  });
}

export class HomeSim {
  hudDirty = true;
  time  = 0;
  bowl = createBowl(250, 500);
  hunger = 100;
  bgImg: HTMLImageElement | null = null;
  bowlImg: HTMLImageElement | null = null;
  bagImg: HTMLImageElement | null = null;
  eatImg: HTMLImageElement | null = null;

  tick(dt: number) {
    const step = Math.min(dt, 0.1); // safety clamp
    this.time += step; // running clock, used for animations
   tickBowl(this.bowl, step, () => {
      this.hunger = 100; // runs ONCE, the moment eating is complete
      this.hudDirty = true;
    });
  }

  loadSprites() {
    return Promise.all([
      loadImage("/sprites/home-bg.png"),
      loadImage("/sprites/bowl.png"),
      loadImage("/sprites/food-bag.png"),
      loadImage("/sprites/pup-eating.png"),
    ]).then(([bg, bowl, bag, eat]) => {
      this.bgImg = bg;
      this.bowlImg = bowl;
      this.bagImg = bag;
      this.eatImg = eat;
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
  }



}