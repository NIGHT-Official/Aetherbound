/*
* Adventurebound -- Game Engine
*/

//----------------------------------------------------------------------------
// 1. Tuning & Constants
//----------------------------------------------------------------------------

export const SPAWN_INTERVAL_FREE = 20.0;
export const SPAWN_INTERVAL_BOOSTED = 10.0;

export const ENERGY_DRAIN_PERIOD_SEC = 0.5;
export const ENERGY_DRAIN_AMOUNT = 1;

export const REGEN_PERIOD_SEC = 2.0;
export const REGEN_ENERGY_AMOUNT = 2;
export const REGEN_HP_CAMP = 3;

export const ENERGY_CAP = 250;
export const ENERGY_START = 250;

export const HP_BASE = 100;
export const HP_PER_LEVEL = 15;
export const HP_START = 100;

export const HEALTH_DROP_MIN = 10;
export const HEALTH_DROP_MAX = 20;

export const STAT_BASE = 5;
export const STAT_PER_LEVEL = 0.5;
export const ATK_PER_LEVEL = 5;

export const XP_MOTE = 15;
export const XP_FIGHT = 50;
export const XP_ECHO = 100;
export const XP_BASE = 100;
export const XP_PER_LEVEL = 100;

export const ENEMY_HP_MIN = 25;
export const ENEMY_HP_MAX = 80;
export const ATK_DMG_MIN = 15;
export const ATK_DMG_MAX = 30;
export const EVA_BLOCK_MIN = 10;
export const EVA_BLOCK_MAX = 25;
export const ENEMY_ATK_MIN = 10;
export const ENEMY_ATK_MAX = 30;
export const SPR_TURNS = 2;
export const SPR_ATK_DEBUFF = 5;
export const SPR_ATK_BUFF = 5;

export const CHOICE_WINDOW_SEC = 5.0;
export const SCROLL_SPEED = 160;

export const LISTEN_P_ENERGY = 0.4;
export const LISTEN_P_ENCOUNTER = 0.2;
export const LISTEN_P_ECHO = 0.2;
export const LISTEN_P_HEALTH = 0.2;
export const LISTEN_P_TRIPLE = 0.35;
export const LISTEN_ENERGY_MIN = 3;
export const LISTEN_ENERGY_MAX = 15;

export const WORLD_W = 720;
export const WORLD_H = 480;
export const GROUND_Y = 384;

export const PLAYER_X = Math.floor(WORLD_W * 0.28);
export const PUP_CELL = 64;
export const PUP_SCALE = 4;
export const PUP_CENTER_X = 34;
export const PUP_FEET_Y = 39;
export const PLAYER_Y = GROUND_Y - 32;
export const PICKUP_RADIUS = 40;

//------------------------------------------------------------------------------
// 2. Pure Math Functions
//------------------------------------------------------------------------------

export function xpNeededFor(level: number): number {
    return Math.max(100, Math.round(100 * Math.pow(Math.max(1, level), 1.4)));
}

export function scaledXp(baseXp: number, level: number): number {
    return Math.round(baseXp * Math.pow(Math.max(1, level), 0.5));
}

export function hpMaxFor(level: number) {
    return HP_BASE + Math.max(0, level - 1) * HP_PER_LEVEL;
}

export function agilityFor(level: number) {
    return STAT_BASE + Math.max(0, level - 1) * STAT_PER_LEVEL;
}

export function spiritFor(level: number) {
    return STAT_BASE + Math.max(0, level - 1) * STAT_PER_LEVEL;
}

export function atkRangeFor(level: number) {
    const bonus = Math.max(0, level - 1) * ATK_PER_LEVEL;
    return { min: ATK_DMG_MIN + bonus, max: ATK_DMG_MAX + bonus };
}

export function rollStep5(min: number, max: number) {
    const steps = Math.floor((max - min) / 5) + 1;
    return min + 5 * Math.floor(Math.random() * steps);
}

// ---------------------------------------------------------------------------
// 3. Types & Interfaces
// ---------------------------------------------------------------------------

export type DropKind = "energy" | "encounter" | "echo" | "health";
export type TravelerKind = "mote" | "encounter";
export type BattleAction = "atk" | "eva" | "grace" | "zeal" | "stun";

export interface Traveler {
  id: number;
  kind: TravelerKind;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  hit: boolean;
  drops: DropKind[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  alive: boolean;
}

export interface Floater {
  x: number;
  y: number;
  vy: number;
  text: string;
  life: number;
  max: number;
}

export interface EchoFx {
  t: number;
  x: number;
  y: number;
  sparked: boolean;
}

export interface LogLine {
  id: number;
  text: string;
}

export interface ChoiceState {
  remaining: number;
  payload: DropKind[];
  queued: DropKind[][];
}

export interface BattleState {
  type: "shade" | "brute" | "wraith";
  enemyHp: number;
  enemyMax: number;
  turn: number;
  shroudTurns: number;
  isVeiled: boolean;
  isGassed: boolean;
  charging: "crush" | "blight" | null;
  flurryBlocked: boolean;
  pendingBlock: number;
  lines: string[];
}

export interface EncounterState {
  queued: number;
  loot: DropKind[];
  queuedLoot: DropKind[][];
  battle: BattleState | null;
}

export interface HudSnapshot {
  adventure: boolean;
  energy: number;
  hp: number;
  hpMax: number;
  level: number;
  xp: number;
  xpNeeded: number;
  agility: number;
  spirit: number;
  spendEnergy: boolean;
  draining: boolean;
  spawnInterval: number;
  banked: number;
  choice: ChoiceState | null;
  encounter: EncounterState | null;
  log: LogLine[];
  graceTurns: number;
  zealTurns: number;
  playerStunned: boolean;
}

export interface DebugSnapshot {
  adventure: boolean;
  energy: number;
  hp: number;
  level: number;
  xp: number;
  xpNeeded: number;
  agility: number;
  spirit: number;
  spendEnergy: boolean;
  banked: number;
  echoes: number;
  spawnInterval: number;
  travelerCount: number;
  kinds: TravelerKind[];
  choice: ChoiceState | null;
  encounter: EncounterState | null;
  worldOffset: number;
  lastOpen: DropKind[];
  echoFx: boolean;
  log: string[];
}

export interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
}

export interface Prop {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// 4. Utility Functions
// ---------------------------------------------------------------------------

let idSeq = 1;
function nextId() {
  idSeq += 1;
  return idSeq;
}

/** 
 * A deterministic Random Number Generator. 
 * This ensures predictable generation if you ever want to save/share map "seeds".
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(v: number, period: number) {
  return ((v % period) + period) % period;
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// ---------------------------------------------------------------------------
// 5. Loot & Drop Logic
// ---------------------------------------------------------------------------

const DROP_KINDS: DropKind[] = ["energy", "encounter", "echo", "health"];

function pickUniqueDrops(count: number): DropKind[] {
  const pool: { kind: DropKind; w: number }[] = [
    { kind: "energy", w: LISTEN_P_ENERGY },
    { kind: "encounter", w: LISTEN_P_ENCOUNTER },
    { kind: "echo", w: LISTEN_P_ECHO },
    { kind: "health", w: LISTEN_P_HEALTH },
  ];
  const n = Math.min(count, pool.length);
  const out: DropKind[] = [];
  
  for (let i = 0; i < n; i++) {
    const total = pool.reduce((sum, p) => sum + p.w, 0);
    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].w;
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    out.push(pool[idx].kind);
    pool.splice(idx, 1); // Remove the picked item so duplicates don't roll
  }
  return out;
}

function rollMoteDrops(forceEncounter = false): DropKind[] {
  const count = Math.random() < LISTEN_P_TRIPLE ? 3 : 2;
  const drops = pickUniqueDrops(count);
  
  if (forceEncounter && !drops.includes("encounter")) {
    if (drops.length >= 3) drops[drops.length - 1] = "encounter";
    else drops.push("encounter");
  }
  return drops;
}

function lootFrom(drops: DropKind[]): DropKind[] {
  return drops.filter((d) => d !== "encounter");
}

function parseBankQueue(raw: unknown, legacyCount: unknown): DropKind[][] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (!Array.isArray(entry)) return [] as DropKind[];
        return entry.filter(isDropKind);
      })
      .slice(0, 999);
  }
  const n = clampInt(legacyCount, 0, 999, 0);
  return Array.from({ length: n }, () => ["energy"] as DropKind[]);
}

function isDropKind(value: unknown): value is DropKind {
  return typeof value === "string" && DROP_KINDS.includes(value as DropKind);
}
function isTravelerKind(value: unknown): value is TravelerKind {
  return value === "mote" || value === "encounter";
}

function parseTravelers(raw: unknown): Traveler[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((value): value is Record<string, unknown> =>
      typeof value === "object" && value !== null,
    )
    .map((value): Traveler => ({
      id: clampInt(value.id, 1, Number.MAX_SAFE_INTEGER, nextId()),
      kind: isTravelerKind(value.kind) ? value.kind : "mote",
      x: Number(value.x),
      y: Number(value.y),
      w: clampInt(value.w, 1, 100, 10),
      h: clampInt(value.h, 1, 100, 10),
      alive: Boolean(value.alive),
      hit: Boolean(value.hit),
      drops: Array.isArray(value.drops)
        ? value.drops.filter(isDropKind)
        : [],
    }));
}



// ---------------------------------------------------------------------------
// 6. Procedural Audio (Web Audio API)
// ---------------------------------------------------------------------------

export class Sfx {
  private ctx: AudioContext | null = null;

  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  tone(freq: number, dur: number, type: OscillatorType, gain = 0.07) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  pickup() { this.tone(880, 0.09, "sine", 0.05); }
  bank() { this.tone(420, 0.12, "triangle", 0.05); }
  listen() { this.tone(523, 0.16, "sine", 0.06); this.tone(784, 0.22, "sine", 0.04); }
  energy() { this.tone(660, 0.12, "sine", 0.05); this.tone(990, 0.16, "sine", 0.03); }
  heal() { this.tone(523, 0.12, "sine", 0.05); this.tone(784, 0.18, "triangle", 0.04); }
  hurt() { this.tone(160, 0.16, "sawtooth", 0.04); }
  atk() { this.tone(220, 0.08, "square", 0.04); this.tone(440, 0.12, "sawtooth", 0.035); }
  eva() { this.tone(196, 0.14, "triangle", 0.05); } 
  spr() { this.tone(523, 0.18, "sine", 0.05); this.tone(784, 0.28, "triangle", 0.035); } 
  level() { this.tone(660, 0.12, "sine", 0.05); this.tone(880, 0.2, "triangle", 0.045); this.tone(1320, 0.24, "sine", 0.03); }
  echo() { this.tone(392, 0.28, "sine", 0.05); this.tone(588, 0.4, "triangle", 0.04); }
  encounter() { this.tone(180, 0.22, "sawtooth", 0.04); }
  run() { this.tone(140, 0.18, "triangle", 0.05); }
}

// ---------------------------------------------------------------------------
// 7. Core Game Engine (State & Combat)
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const LOG_CAP = 8;
const PARTICLE_CAP = 80;
const SAVE_KEY = "spirit-sleep-save";
const SAVE_VERSION = 2;

export class SpiritGame {
  adventure = false;
  energy = ENERGY_START;
  hp = HP_START;
  level = 1;
  xp = 0;
  spendEnergy = false;
  bankQueue: DropKind[][] = [];
  echoes = 0;
  spawnTimer = 0;
  drainAcc = 0;
  regenAcc = 0;
  worldOffset = 0;
  time = 0;
  travelers: Traveler[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  choice: ChoiceState | null = null;
  encounter: EncounterState | null = null;
  // Player Combat State
  graceTurns: number = 0;
  zealTurns: number = 0;
  playerStunned: boolean = false;
  stashedChoice: ChoiceState | null = null;
  echoFx: EchoFx | null = null;
  lastOpen: DropKind[] = [];
  log: LogLine[] = [];
  listenFlash = 0;
  shake = 0;
  hudDirty = true;
  reducedMotion = false;
  spritesReady = false;
  
  private lastSave = "";
  private saveAcc = 0;
  private choiceHudAcc = 0;
  
  // We will configure these in Chunk 5
  bgImg: HTMLImageElement | null = null;
  walkImg: HTMLImageElement | null = null;
  idleImg: HTMLImageElement | null = null;

  readonly stars: Star[] = [];
  readonly stones: Prop[] = [];
  readonly hills: Prop[] = [];
  readonly sfx = new Sfx();

  constructor() {
    const rng = mulberry32(0x5e1e);
    // Generate map props procedurally
    for (let i = 0; i < 46; i++) {
      this.stars.push({
        x: rng() * WORLD_W,
        y: rng() * (GROUND_Y - 80),
        r: rng() * 1.4 + 0.4,
        phase: rng() * TAU,
      });
    }
    for (let i = 0; i < 7; i++) {
      const h = 28 + rng() * 54;
      this.stones.push({ x: i * 130 + rng() * 40, y: GROUND_Y - h, w: 10 + rng() * 16, h });
    }
    for (let i = 0; i < 5; i++) {
      const h = 36 + rng() * 28;
      this.hills.push({ x: i * 180 + rng() * 30, y: GROUND_Y - h, w: 120 + rng() * 80, h });
    }
    // Pool cosmetic particles to prevent memory leaks
    for (let i = 0; i < PARTICLE_CAP; i++) {
      this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: "#d8d6cc", alive: false });
    }
    
   const restored = this.loadSave();
    this.pushLog(restored ? "Save restored." : "Ready. Start an adventure to walk.");
  }

  // --- Getters for Dynamic Stats --------------------------
  get banked() { return this.bankQueue.length; }
  get hpMax() { return hpMaxFor(this.level); }
  get agility() { return agilityFor(this.level); }
  get spirit() { return spiritFor(this.level); }
  get spawnInterval() { return this.spendEnergy && this.energy > 0 ? SPAWN_INTERVAL_BOOSTED : SPAWN_INTERVAL_FREE; }
  get draining() { return this.adventure && this.spendEnergy && this.energy > 0; }

  // --- Audio & Accessibility ---------------------------------
  unlockAudio() { this.sfx.unlock(); }
  setReducedMotion(on: boolean) { this.reducedMotion = on; }

  // --- Combat Logic ------------------------------------
  fightEncounter() {
    if (!this.encounter || this.encounter.battle) return;
    
    // 1. Roll archetype (33% chance each)
    const roll = Math.random();
    const levelBonus = Math.max(0, this.level -1) * 10; // slightly scale enemy HP with player level
    let type: "shade" | "brute" | "wraith";
    let maxHp: number;

    // 2. Assign HP using your existing rollStep5 utility and design notes
    if (roll < 0.33) {
      type = "shade";
      maxHp  = rollStep5(45 + levelBonus, 75 + levelBonus); 
    } else if (roll < 0.66) {
      type = "brute";
      maxHp = rollStep5(90 + levelBonus, 140 + levelBonus);
    } else {
      type = "wraith";
      maxHp = rollStep5(55 + levelBonus, 85 + levelBonus);
    }

    // 3. Boot up the state machine
    this.encounter.battle = {
      type,
      enemyHp: maxHp,
      enemyMax: maxHp,
      turn: 1,
      shroudTurns: 0,
      isVeiled: false,
      isGassed: false,
      charging: null,
      flurryBlocked: false,
      pendingBlock: 0,
      lines: [`Encountered a ${type.toUpperCase()}!`]
    };

    // 4. Reset player buffs for a fresh fight
    this.graceTurns = 0;
    this.zealTurns = 0;
    this.playerStunned = false;

    this.sfx.encounter();
    this.pushLog(`Battle — ${type.toUpperCase()} (${maxHp} HP)`);
    this.hudDirty = true;
  }

  battleAction(action: BattleAction) {
    const battle = this.encounter?.battle;
    if (!battle) return;

    // INTERCEPTOR: If the Brute crushed you, you lose this turn.
    if (this.playerStunned) {
      this.playerStunned = false;
      this.shake = 0.4;
      this.battleLine(battle, "STUNNED! You stagger and lose your turn.");
      this.resolveEnemyAttack(battle);
      return;
    }

    if (action === "atk") this.resolveAtk(battle);
    else if (action === "eva") this.resolveEva(battle);
    else if (action === "grace") this.resolveGrace(battle);
    else if (action === "zeal") this.resolveZeal(battle);
    else if (action === "stun") this.resolveStun(battle);

    if (battle.enemyHp <= 0) {
      this.winBattle();
      return;
    }
    this.resolveEnemyAttack(battle);
  }

  private resolveAtk(battle: BattleState) {
    // INTERCEPTOR: If Shade used Veil on its last turn, your ATK automatically fails.
    if (battle.isVeiled) {
      this.sfx.eva();
      this.battleLine(battle, `ATK missed! The Shade is in the Veil.`);
      return; 
    }

    const range = atkRangeFor(this.level);
    let dmg = rollStep5(range.min, range.max);
    
    // 1. Zeal Buff (+50% DMG output)
    if (this.zealTurns > 0) {
      dmg = Math.floor(dmg * 1.5);
    }
    
    // 2. Enemy Shroud Mitigation (-50% DMG taken)
    if (battle.shroudTurns > 0) {
      dmg = Math.floor(dmg * 0.5);
    }

    // 3. Enemy Gassed Penalty (+25% DMG taken)
    if (battle.isGassed) {
      dmg = Math.floor(dmg * 1.25);
    }
    
    battle.enemyHp = Math.max(0, battle.enemyHp - dmg);
    this.sfx.atk();
    this.floatText(PLAYER_X + 48, PLAYER_Y - 36, `-${dmg}`);
    this.battleLine(battle, `ATK — ${dmg} dmg`);
  }

  private resolveEva(battle: BattleState) {
    // Math: Active EVA calculates your asymptotic curve.
    // We store the resulting mitigation percentage as a decimal (0.20 to 0.75).
    const factor = this.agility / (this.agility + 25);
    const minBlock = 0.20 + (0.15 * factor);
    const maxBlock = 0.50 + (0.35 * factor);
    const mitigatePct = minBlock + Math.random() * (maxBlock - minBlock);
    
    // Storing this lets the enemy AI know you are prepared for telegraphed strikes
    battle.pendingBlock = mitigatePct; 
    
    this.sfx.eva();
    this.battleLine(battle, `EVA — Glancing Stance prepared`);
  }

  private resolveGrace(battle: BattleState) {
    this.graceTurns = 2;
    this.sfx.spr(); 
    this.battleLine(battle, `GRACE — Defense buffed for 2 turns`);
  }

  private resolveZeal(battle: BattleState) {
    this.zealTurns = 2;
    this.sfx.spr();
    this.battleLine(battle, `ZEAL — Attack buffed for 2 turns`);
  }

  private resolveStun(battle: BattleState) {
    this.zealTurns = 0; // The stun consumes the player's Zeal
    battle.charging = null; // Immediately shatter the enemy's cast
    battle.shroudTurns = 0; // Strip defensive buffs
    
    // To skip the enemy's execution turn, we force their state loop to Phase 5 (Recover)
    battle.turn = 5; 
    
    this.sfx.atk(); 
    this.shake = 0.4;
    this.battleLine(battle, `STUN — The enemy's concentration is shattered!`);
  }

  private resolveEnemyAttack(battle: BattleState) {
    // 1. Tick down active buffs
    if (this.graceTurns > 0) this.graceTurns -= 1;
    if (this.zealTurns > 0) this.zealTurns -= 1;
    if (battle.shroudTurns > 0) battle.shroudTurns -= 1;

    let hit = 0;
    let actionText = "";
    let isTelegraphedStrike = false;

    // Clear one-turn flags before the enemy calculates its new move
    battle.isVeiled = false;
    battle.isGassed = false;
    
    // --- PHASE 3: THE ENEMY BRAIN ---
    switch (battle.type) {
      
      case "shade": {
        const sTurn = (battle.turn - 1) % 3 + 1; // Loops: 1, 2, 3
        if (sTurn === 1) {
          battle.isVeiled = true; // Protects against player's next ATK
          actionText = "Shade slips into the Veil (Invulnerable)";
        } else if (sTurn === 2) {
          hit = rollStep5(15, 25);
          // Check if player used EVA or GRACE to block the flurry
          battle.flurryBlocked = (battle.pendingBlock > 0 || this.graceTurns > 0);
          actionText = "Shade unleashes a rapid Flurry!";
        } else {
          if (battle.flurryBlocked) {
            battle.isGassed = true; // Vulnerable to player's next ATK
            actionText = "Shade is Gassed! (+25% DMG Taken)";
          } else {
            hit = rollStep5(10, 15);
            battle.isVeiled = true;
            actionText = "Shade Fades! Strikes and vanishes.";
          }
        }
        break;
      }

      case "brute": {
        const bTurn = (battle.turn - 1) % 4 + 1; // Loops: 1, 2, 3, 4
        if (bTurn === 1) {
          hit = rollStep5(20, 30);
          actionText = "Brute swings a Heavy Cleave.";
        } else if (bTurn === 2) {
          battle.charging = "crush";
          actionText = "Brute plants its feet... (Charging Crush)";
        } else if (bTurn === 3) {
          hit = rollStep5(45, 60);
          isTelegraphedStrike = true;
          actionText = "Brute releases CRUSH!";
          // If player did not actively Evade, stun them
          if (battle.pendingBlock === 0) this.playerStunned = true;
          battle.charging = null;
        } else {
          actionText = "Brute is off-balance and recovers.";
        }
        break;
      }

      case "wraith": {
        const wTurn = (battle.turn - 1) % 5 + 1; // Loops: 1, 2, 3, 4, 5
        if (wTurn === 1) {
          battle.shroudTurns = 2;
          actionText = "Wraith casts Shroud (Damage Halved).";
        } else if (wTurn === 2) {
          hit = 15 + Math.floor(5 * Math.pow(this.level, 0.5));
          battle.enemyHp = Math.min(battle.enemyMax, battle.enemyHp + hit);
          actionText = `Wraith casts Siphon, draining HP!`;
        } else if (wTurn === 3) {
          battle.charging = "blight";
          actionText = "Dark energy surges! Wraith channels Blight!";
        } else if (wTurn === 4) {
          hit = rollStep5(50, 70); 
          isTelegraphedStrike = true;
          actionText = "Wraith unleashes BLIGHT!";
          battle.charging = null;
        } else {
          actionText = "Wraith's energy is depleted. It recovers.";
          battle.charging = null; // Failsafe in case of Stun interrupt
        }
        break;
      }
    }

    // --- PHASE 4: DEFENSE & DAMAGE PIPELINE ---
    const mitigatePct = battle.pendingBlock; 
    battle.pendingBlock = 0; // Reset so block doesn't carry over
    let taken = 0;

    if (hit > 0) {
      if (mitigatePct > 0 && isTelegraphedStrike) {
        // Active EVA grants 100% block against telegraphed nukes
        taken = 0;
        this.battleLine(battle, `PERFECT DODGE! Avoided ${hit} DMG.`);
      } else {
        // Standard evasion mitigation & Grace flat block
        if (mitigatePct > 0) hit = Math.floor(hit * (1 - mitigatePct));
        if (this.graceTurns > 0) {
           const graceBlock = Math.floor(15 * Math.pow(this.level, 0.5));
           hit = Math.max(0, hit - graceBlock);
        }
        taken = Math.max(1, hit); // Minimum 1 chip damage if attack connected
      }
    }

    // Output what the enemy did
    this.battleLine(battle, actionText);
    
    // Apply damage to player
    if (taken > 0) {
      this.hp = Math.max(0, this.hp - taken);
      this.sfx.hurt();
      this.shake = this.reducedMotion ? 0 : 0.4;
      this.battleLine(battle, `Took ${taken} damage.`);
    } else if (hit === 0 && actionText !== "") {
       // Utility cast (no damage), skip damage log and hurt sound
    } else {
      this.sfx.eva();
    }
    
    // Advance the loop
    battle.turn += 1;
    this.hudDirty = true;
    
    // Death Check
    if (this.hp <= 0) {
      this.encounter = null;
      this.stashedChoice = null;
      this.endAdventure("fell");
    }
  }

  private winBattle() {
    const loot = this.encounter?.loot ?? [];
    const earnedXp = scaledXp(XP_FIGHT, this.level);
    
    this.pushLog(`Won the fight — +${XP_FIGHT} XP`);
    this.addXp(earnedXp);
    
    const payload = loot.filter((d) => d !== "encounter");
    this.bankQueue.push(payload);
    this.pushLog("Banked the mote");

    const encounter = this.encounter;
    const nextLoot = encounter?.queuedLoot.shift();

    if (nextLoot && encounter) {
      encounter.loot = nextLoot;
      encounter.queued = encounter.queuedLoot.length;
      encounter.battle = null;
      this.pushLog("Another encounter approaches.");
    } else {
      this.encounter = null;
      this.resumeStashedMotes();
    }

  this.hudDirty = true;
}

  runEncounter() {
    if (!this.encounter) return;
    this.sfx.run();
    this.encounter = null;
    this.stashedChoice = null;
    this.endAdventure("run");
    this.hudDirty = true;
  }

  private battleLine(battle: BattleState, text: string) {
    battle.lines.push(text);
    if (battle.lines.length > 4) battle.lines.splice(0, battle.lines.length - 4);
    this.pushLog(text);
  }

  private endAdventure(reason: "manual" | "run" | "fell") {
    if (!this.adventure && reason !== "run") return;
    this.adventure = false;
    this.drainAcc = 0;
    this.regenAcc = 0;

    if (reason === "run") {
      const lost = Math.ceil(this.bankQueue.length / 2);
      for (let i = 0; i < lost; i++) {
        if (this.bankQueue.length === 0) break;
        const idx = Math.floor(Math.random() * this.bankQueue.length);
        this.bankQueue.splice(idx, 1);
      }
      this.pushLog(lost > 0 ? `Ran — made camp, lost ${lost} from the bank` : "Ran — made camp");
    } else if (reason === "fell") {
      this.pushLog("Fell — made camp, bank intact");
    } else {
      this.pushLog("Made camp — bank intact");
    }
    this.hudDirty = true;
  }
 
  // --- Mote Spawning & Collision ---------------------------------------
  private spawnTraveler(forceEncounter = false) {
    const drops = rollMoteDrops(forceEncounter);
    const hostile = drops.includes("encounter");
    let t = this.travelers.find((x) => !x.alive);
    
    if (!t) {
      t = {
        id: nextId(),
        kind: hostile ? "encounter" : "mote",
        x: 0, y: 0, w: 8, h: 8,
        alive: true, hit: false, drops,
      };
      this.travelers.push(t);
    }
    
    t.id = nextId();
    t.kind = hostile ? "encounter" : "mote";
    t.drops = drops;
    t.alive = true;
    t.hit = false;
    t.x = WORLD_W + 18; // Spawn just off the right edge of the screen
    
    if (hostile) {
      t.w = 16; t.h = 16; t.y = PLAYER_Y - 8;
    } else {
      t.w = 10; t.h = 10; t.y = PLAYER_Y - 4 + (Math.random() * 16 - 8);
    }
  }

  private tryHit(t: Traveler) {
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    // Basic Geometry: Calculating distance between two points
    const dx = cx - PLAYER_X;
    const dy = cy - PLAYER_Y;
    const r = PICKUP_RADIUS + t.w * 0.5;
    
    if (dx * dx + dy * dy > r * r) return; // If outside radius, ignore
    
    t.hit = true;
    t.alive = false;
    this.acquireMote(t, cx, cy);
  }

  private acquireMote(t: Traveler, x: number, y: number) {
    this.sfx.pickup();
    const hostile = t.drops.includes("encounter");
    this.burst(x, y, 14, hostile ? "#c45c4a" : "#dfe3ea");
    
    const earnedXp = scaledXp(XP_MOTE, this.level);
    this.addXp(earnedXp);
    
    if (hostile) {
      this.shake = this.reducedMotion ? 0 : 0.55;
      this.beginEncounter(lootFrom(t.drops));
      this.pushLog("Red mote — fight · +15 XP");
      return;
    }
    
    if (this.encounter) {
      if (this.stashedChoice) {
        this.stashedChoice.queued.push([...t.drops]);
      } else {
        this.stashedChoice = { remaining: CHOICE_WINDOW_SEC, payload: [...t.drops], queued: [] };
      }
      this.pushLog("Mote waiting after the fight · +15 XP");
      this.hudDirty = true;
      return;
    }
    
    if (this.choice) {
      this.choice.queued.push([...t.drops]);
      this.pushLog("Mote queued for choice · +15 XP");
    } else {
      this.choice = { remaining: CHOICE_WINDOW_SEC, payload: [...t.drops], queued: [] };
      this.pushLog("Mote acquired — Bank or Listen · +15 XP");
    }
    this.hudDirty = true;
  }

// --- Persistence & Saving ---------------------------------------------
  persistNow() {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({
      v: SAVE_VERSION,
      energy: this.energy,
      hp: this.hp,
      level: this.level,
      xp: this.xp,
      bankQueue: this.bankQueue,
      echoes: this.echoes,
      spendEnergy: this.spendEnergy,
      //Added for traveler save data------------------------------------------------
      travelers: this.travelers,
      spawnTimer: this.spawnTimer
    });
    if (payload === this.lastSave) return; // Prevent unnecessary writes
    this.lastSave = payload;
    try {
      window.localStorage.setItem(SAVE_KEY, payload);
    } catch {
      /* Fails silently in private browsing modes */
    }
  }

  private loadSave(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as {
        v?: number; energy?: number; hp?: number; level?: number;
        xp?: number; banked?: number; bankQueue?: unknown; echoes?: number; spendEnergy?: boolean;
        travelers?: Traveler[]; spawnTimer?: number;
      };
      
      if (data.v !== 1 && data.v !== SAVE_VERSION) return false; // Version mismatch
      
      this.level = clampInt(data.level, 1, 99, 1);
      const maxHp = hpMaxFor(this.level);
      this.energy = clampInt(data.energy, 0, ENERGY_CAP, ENERGY_START);
      this.hp = clampInt(data.hp, 0, maxHp, Math.min(HP_START, maxHp));
      this.xp = clampInt(data.xp, 0, xpNeededFor(this.level) - 1, 0);
      this.bankQueue = parseBankQueue(data.bankQueue, data.banked);
      this.echoes = clampInt(data.echoes, 0, 999, 0);
      this.spendEnergy = Boolean(data.spendEnergy) && this.energy > 0;

      //Added for traveler save data-----------------------------------------------------
      this.travelers = parseTravelers(data.travelers);
      this.spawnTimer = typeof data.spawnTimer === "number" && Number.isFinite(data.spawnTimer) 
      ? Math.max(0, Math.min(data.spawnTimer, SPAWN_INTERVAL_FREE)) : 0;

      this.lastSave = raw;
      return true;
    } catch {
      return false;
    }
  }

  resetSave() {
    this.adventure = false;
    this.energy = ENERGY_START;
    this.hp = HP_START;
    this.level = 1;
    this.xp = 0;
    this.spendEnergy = false;
    this.bankQueue = [];
    this.echoes = 0;
    this.spawnTimer = 0;
    this.drainAcc = 0;
    this.choiceHudAcc = 0;
    this.regenAcc = 0;
    this.worldOffset = 0;
    this.choice = null;
    this.encounter = null;
    this.stashedChoice = null;
    this.echoFx = null;
    this.lastOpen = [];
    this.listenFlash = 0;
    this.shake = 0;
    for (const t of this.travelers) t.alive = false;
    this.floaters.length = 0;
    for (const p of this.particles) p.alive = false;
    this.log = [];
    this.lastSave = "";
    
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(SAVE_KEY);
      } catch { /* ignore */ }
    }
    this.pushLog("Save reset.");
    this.hudDirty = true;
  }

  // --- Core Loop (Tick) ------------------------------------------------
  tick(dt: number) {
    const step = Math.min(dt, 0.1);
    this.time += step;

    // Auto-save every 1 second
    this.saveAcc += step;
    if (this.saveAcc >= 1) {
      this.saveAcc = 0;
      this.persistNow();
    }

    // Handle Choice Timer Countdown
    if (this.choice && !this.encounter) {
  this.choice.remaining -= step;
  this.choiceHudAcc += step;

  if (this.choice.remaining <= 0) {
    this.choiceHudAcc = 0;
    this.resolveChoice("auto");
  } else if (this.choiceHudAcc >= 0.25) {
    this.choiceHudAcc -= 0.25;
    this.hudDirty = true;
  }
}

    // Handle Camp Regeneration
    if (!this.adventure) {
      this.tickRegen(step);
    }

    // Handle Active Walking
    if (this.adventure && !this.encounter) {
      this.worldOffset += SCROLL_SPEED * step;
      this.spawnTimer += step;
      const interval = this.spawnInterval;
      
      while (this.spawnTimer >= interval) {
        this.spawnTimer -= interval;
        this.spawnTraveler();
      }

      if (this.spendEnergy && this.energy > 0) {
        this.drainAcc += step;
        while (this.drainAcc >= ENERGY_DRAIN_PERIOD_SEC && this.energy > 0) {
          this.drainAcc -= ENERGY_DRAIN_PERIOD_SEC;
          this.energy = Math.max(0, this.energy - ENERGY_DRAIN_AMOUNT);
          this.hudDirty = true;
          if (this.energy <= 0) {
            this.spendEnergy = false;
            this.drainAcc = 0;
            this.pushLog("Energy depleted — spend off. Free spawn rate.");
          }
        }
      }

      const dx = SCROLL_SPEED * step;
      for (const t of this.travelers) {
        if (!t.alive) continue;
        t.x -= dx; // Move mote leftward
        if (!t.hit) this.tryHit(t); // Check collision
        if (t.x + t.w < -24) { // Despawn if off-screen
          if (!t.hit && t.kind === "mote") this.pushLog("Mote missed");
          t.alive = false;
        }
      }

      if (this.time % 0.16 < step) this.footstepDust();
    }

    // Process Visual Effects and Physics------------------------------------------
    this.listenFlash = Math.max(0, this.listenFlash - step);
    this.shake = Math.max(0, this.shake - step * 2.4);

    if (this.echoFx) {
      this.echoFx.t += step;
      if (!this.echoFx.sparked && this.echoFx.t >= 0.74) {
        this.echoFx.sparked = true;
        this.burst(this.echoFx.x, this.echoFx.y, 22, "#e8e6df");
      }
      if (this.echoFx.t >= 1.35) this.echoFx = null;
    }

    // Particle Physics (Gravity and Velocity)------------------------------------
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life -= step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vy += 80 * step; // Gravity pulls them down
      if (p.life <= 0) p.alive = false;
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= step;
      f.y += f.vy * step;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  private tickRegen(step: number) {
    if (this.encounter) return;
    const needHp = this.hp < this.hpMax;
    const needEn = this.energy < ENERGY_CAP;
    if (!needHp && !needEn) {
      this.regenAcc = 0;
      return;
    }
    this.regenAcc += step;
    while (this.regenAcc >= REGEN_PERIOD_SEC) {
      this.regenAcc -= REGEN_PERIOD_SEC;
      if (this.hp < this.hpMax) this.hp = Math.min(this.hpMax, this.hp + REGEN_HP_CAMP);
      if (this.energy < ENERGY_CAP) this.energy = Math.min(ENERGY_CAP, this.energy + REGEN_ENERGY_AMOUNT);
      this.hudDirty = true;
    }
  }

  // --- State Interactions ---------------------------------------
 setAdventure(on: boolean) {
    if (this.encounter) {
      this.pushLog("Cannot make camp during battle!");
      return;
    }
    if (on) {
      if (this.adventure) return;
      this.adventure = true;
      this.spawnTimer = this.spawnInterval;
      this.regenAcc = 0;
      this.pushLog("Adventure started");
    } else {
      this.endAdventure("manual");
    }
    this.hudDirty = true;
  }

  toggleSpend() {
    if (this.spendEnergy) {
      this.spendEnergy = false;
      this.drainAcc = 0;
      this.pushLog("Spend Energy: OFF");
    } else if (this.energy <= 0) {
      this.pushLog("No energy to spend");
    } else {
      this.spendEnergy = true;
      this.pushLog("Spend Energy: ON");
    }
    this.hudDirty = true;
  }
  
  chooseBank() { if (!this.encounter) this.resolveChoice("bank"); }
  chooseListen() { if (!this.encounter) this.resolveChoice("listen"); }
  listenFromBank() {
    if (this.encounter || this.bankQueue.length <= 0) return;
    const drops = this.bankQueue.shift() ?? [];
    this.applyDrops(drops, "from bank");
  }

  private resolveChoice(kind: "bank" | "listen" | "auto") {
    if (!this.choice) return;
    this.choiceHudAcc = 0;
    const current = [...this.choice.payload];
    const rest = this.choice.queued.map((d) => [...d]);
    
    if (kind === "listen") {
      this.choice = null;
      this.applyDrops(current, "on pickup");
    } else {
      this.bankQueue.push(current);
      this.sfx.bank();
      this.pushLog(kind === "auto" ? "Auto-banked a mote" : "Banked a mote");
    }
    
    if (rest.length > 0) {
      this.choice = { remaining: CHOICE_WINDOW_SEC, payload: rest[0], queued: rest.slice(1) };
    } else {
      this.choice = null;
    }
    this.choiceHudAcc = 0;
    this.hudDirty = true;
  }

  private applyDrops(drops: DropKind[], source: string): DropKind[] {
    const payload = drops.filter((d) => d !== "encounter");
    this.lastOpen = [...payload];
    if (payload.length === 0) {
      this.pushLog(`Opened a mote (${source}) — already spent`);
      return payload;
    }
    this.sfx.listen();
    this.listenFlash = 0.28;

    const parts: string[] = [];
    let floatY = PLAYER_Y - 28;
    const maxHp = this.hpMax;

    if (payload.includes("energy")) {
      const amt = LISTEN_ENERGY_MIN + Math.floor(Math.random() * (LISTEN_ENERGY_MAX - LISTEN_ENERGY_MIN + 1));
      
      //Calculate the overflow BEFORE applying the cap
      const missingEnergy = ENERGY_CAP - this.energy;
      const overflowEnergy = Math.max(0, amt - missingEnergy);

      this.energy = Math.min(ENERGY_CAP, this.energy + amt);
      this.sfx.energy();
      this.floatText(PLAYER_X, floatY, `+${amt} energy`);
      floatY -= 18;
      parts.push(`+${amt} energy`);

      // If we overcapped, turn it into XP
      if (overflowEnergy > 0) {
        this.addXp(overflowEnergy);
        this.floatText(PLAYER_X + 24, floatY, `+${overflowEnergy} XP (overflow)`);
        floatY -= 18;
      }  
    }

    if (payload.includes("health")) {
      const amt = HEALTH_DROP_MIN + Math.floor(Math.random() * (HEALTH_DROP_MAX - HEALTH_DROP_MIN + 1));
      const healed = Math.min(maxHp - this.hp, amt);

      //Calculate the overflow BEFORE applying the cap
      const missingHp = this.hpMax - this.hp;
      const overflowHp = Math.max(0, amt - missingHp);  

      this.hp = Math.min(maxHp, this.hp + amt);
      this.sfx.heal();
      this.floatText(PLAYER_X, floatY, `+${amt} HP`);
      floatY -= 18;
      parts.push(healed > 0 ? `+${amt} HP` : `+${amt} HP (full)`);

      //If we overcapped, turn it into XP
      if (overflowHp > 0) {
        this.addXp(overflowHp);
        this.floatText(PLAYER_X + 24, floatY, `+${overflowHp} XP (overflow)`);
        floatY -= 18;
      }
    }
    if (payload.includes("echo")) {
      this.echoes += 1;
      const earnedXp = scaledXp(XP_ECHO, this.level);
      this.addXp(earnedXp);
      this.sfx.echo();
      this.echoFx = { t: 0, x: PLAYER_X + 72, y: PLAYER_Y - 36, sparked: false };
      this.floatText(PLAYER_X, floatY, "Echo found");
      parts.push(`Echo found · +${earnedXp} XP`);
    }

    this.pushLog(`Listened to a mote (${source}) — ${parts.join(", ")}`);
    return payload;
  }

  private beginEncounter(loot: DropKind[]) {
    if (this.choice) {
      this.stashedChoice = this.choice;
      this.choice = null;
    }
    if (this.encounter) {
      this.encounter.queuedLoot.push(loot);
      this.encounter.queued = this.encounter.queuedLoot.length;
      this.pushLog("Encounter queued");
    } else {
      this.encounter = { queued: 0, loot, queuedLoot: [], battle: null };
      this.sfx.encounter();
      this.pushLog("Encounter!");
    }
    this.hudDirty = true;
  }

  private resumeStashedMotes() {
    if (!this.stashedChoice) return;
    this.choice = { remaining: CHOICE_WINDOW_SEC, payload: [...this.stashedChoice.payload], queued: this.stashedChoice.queued.map((d) => [...d]) };
    this.stashedChoice = null;
    this.choiceHudAcc = 0;
    this.pushLog("Mote acquired — Bank or Listen");
  }

  private addXp(amount: number) {
    if (amount <= 0) return;
    this.xp += amount;
    let ups = 0;
    while (this.xp >= xpNeededFor(this.level)) {
      this.xp -= xpNeededFor(this.level);
      const oldMax = hpMaxFor(this.level);
      this.level += 1;
      this.hp += hpMaxFor(this.level) - oldMax;
      ups += 1;
    }
    if (ups > 0) {
      this.sfx.level();
      this.pushLog(`Level up — ${this.level}`);
    }
    this.hudDirty = true;
  }

  private floatText(x: number, y: number, text: string) {
    this.floaters.push({ x, y, vy: -28, text, life: 1.1, max: 1.1 });
  }

  private pushLog(text: string) {
    this.log.unshift({ id: nextId(), text });
    if (this.log.length > LOG_CAP) this.log.length = LOG_CAP;
    this.hudDirty = true;
  }

  private burst(x: number, y: number, n: number, color: string) {
    let left = n;
    for (const p of this.particles) {
      if (left <= 0) break;
      if (p.alive) continue;
      const a = Math.random() * TAU;
      const sp = 40 + Math.random() * 90;
      p.alive = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - 30;
      p.max = 0.35 + Math.random() * 0.35;
      p.life = p.max;
      p.size = 1.5 + Math.random() * 2.2;
      p.color = color;
      left -= 1;
    }
  }

  private footstepDust() {
    this.burst(PLAYER_X - 4, GROUND_Y - 2, 2, "rgba(93,64,55,0.55)");
  }

  // --- Rendering (The Geometry) -----------------------------------
  draw(ctx: CanvasRenderingContext2D) {
    const shakeAmt = this.reducedMotion ? 0 : this.shake * this.shake * 10;
    const ox = shakeAmt ? (Math.random() * 2 - 1) * shakeAmt : 0;
    const oy = shakeAmt ? (Math.random() * 2 - 1) * shakeAmt * 0.4 : 0;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.imageSmoothingEnabled = false; // Keeps pixel art crisp
    
    this.drawWorld(ctx);
    this.drawTravelers(ctx);
    this.drawPup(ctx);
    this.drawEcho(ctx);
    this.drawParticles(ctx);
    this.drawFloaters(ctx);
    ctx.restore();

    if (this.listenFlash > 0) {
      ctx.fillStyle = `rgba(232,230,223,${0.28 * (this.listenFlash / 0.35)})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }

  private drawWorld(ctx: CanvasRenderingContext2D) {
    if (this.bgImg) {
      const ox = wrap(this.worldOffset, WORLD_W);
      ctx.drawImage(this.bgImg, -ox, 0, WORLD_W, WORLD_H);
      ctx.drawImage(this.bgImg, WORLD_W - ox, 0, WORLD_W, WORLD_H);
      return;
    }
    // Fallback if background.png is missing
    ctx.fillStyle = "#a8dadc";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = "#78a359";
    ctx.fillRect(0, GROUND_Y - 12, WORLD_W, WORLD_H - GROUND_Y + 12);
  }

  private drawTravelers(ctx: CanvasRenderingContext2D) {
    for (const t of this.travelers) {
      if (!t.alive) continue;
      const cx = t.x + t.w / 2;
      const cy = t.y + t.h / 2;
      const hostile = t.drops.includes("encounter");
      
      if (!hostile) {
        // Draw standard mote (Silver/White)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
        g.addColorStop(0, "rgba(232,230,223,0.55)");
        g.addColorStop(1, "rgba(232,230,223,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#e8e6df";
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, TAU);
        ctx.fill();
      } else {
        // Draw encounter mote (Red/Hostile)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
        g.addColorStop(0, "rgba(196,92,74,0.5)");
        g.addColorStop(1, "rgba(196,92,74,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#c45c4a";
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(232,230,223,0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, TAU);
        ctx.stroke();
      }
    }
  }

  private drawPup(ctx: CanvasRenderingContext2D) {
    const walking = this.adventure && !this.encounter;
    const sheet = walking ? this.walkImg : this.idleImg;
    const frames = walking ? 4 : 12;
    const fps = walking ? 8 : 6;
    const frame = Math.floor(this.time * fps) % frames;
    const dw = PUP_CELL * PUP_SCALE;
    const dx = PLAYER_X - PUP_CENTER_X * PUP_SCALE;
    const dy = GROUND_Y - PUP_FEET_Y * PUP_SCALE;

    // 1. Draw the Drop Shadow (Normal)
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(PLAYER_X, GROUND_Y + 3, 22, 6, 0, 0, TAU);
    ctx.fill();

    if (!sheet) return;

    // 2. Isolate the canvas state so we don't accidentally flip the whole world
    ctx.save();
    
    // 3. Move the canvas origin point to the exact geometric center of the pup
    ctx.translate(dx + dw / 2, dy + dw / 2);
    
    // 4. Invert the X-axis (this creates the mirror effect)
    ctx.scale(-1, 1);
    
    // 5. Draw the image relative to our new inverted center point
    ctx.drawImage(sheet, frame * PUP_CELL, 0, PUP_CELL, PUP_CELL, -dw / 2, -dw / 2, dw, dw);
    
    // 6. Restore the canvas back to normal for the next frame
    ctx.restore();
  }

  private drawEcho(ctx: CanvasRenderingContext2D) {
    if (!this.echoFx) return;
    const u = this.echoFx.t / 1.35;
    let radius: number;
    let alpha: number;
    
    if (u < 0.22) {
      const k = u / 0.22;
      radius = 10 + k * 38;
      alpha = k;
    } else if (u < 0.55) {
      radius = 48 + Math.sin((u - 0.22) * 22) * 4;
      alpha = 1;
    } else {
      const k = (u - 0.55) / 0.45;
      radius = 48 * (1 - k) * (1 - k) + 4;
      alpha = 1 - k;
    }
    
    const { x, y } = this.echoFx;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.8);
    g.addColorStop(0, "rgba(232,230,223,0.95)");
    g.addColorStop(0.45, "rgba(197,204,214,0.45)");
    g.addColorStop(1, "rgba(197,204,214,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e8e6df";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, radius * 0.35), 0, TAU);
    ctx.fill();
    if (u > 0.55) {
      ctx.strokeStyle = `rgba(232,230,223,${(1 - (u - 0.55) / 0.45) * 0.7})`;
      ctx.lineWidth = 1.5;
      const ring = radius + (u - 0.55) * 50;
      ctx.beginPath();
      ctx.arc(x, y, ring, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }

  private drawFloaters(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = "600 14px Figtree, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = "#e8e6df";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Snapshot Exports for React UI ----------------------------------
  getHud(): HudSnapshot {
    return {
      adventure: this.adventure, energy: this.energy, hp: this.hp, hpMax: this.hpMax,
      level: this.level, xp: this.xp, xpNeeded: xpNeededFor(this.level),
      agility: this.agility, spirit: this.spirit, spendEnergy: this.spendEnergy,
      draining: this.draining, spawnInterval: this.spawnInterval, banked: this.banked,
      choice: this.choice ? { remaining: this.choice.remaining, payload: [...this.choice.payload], queued: this.choice.queued.map((d) => [...d]) } : null,
      encounter: this.encounter ? { queued: this.encounter.queuedLoot.length, loot: [...this.encounter.loot], queuedLoot: this.encounter.queuedLoot.map((d) => [...d]), battle: this.encounter.battle ? { ...this.encounter.battle, lines: [...this.encounter.battle.lines] } : null } : null,
      log: this.log.map((l) => ({ ...l })),
      graceTurns: this.graceTurns,
      zealTurns: this.zealTurns,
      playerStunned: this.playerStunned,
    };
  }

  getDebug(): DebugSnapshot {
    const live = this.travelers.filter((t) => t.alive);
    return {
      adventure: this.adventure, energy: this.energy, hp: this.hp, level: this.level,
      xp: this.xp, xpNeeded: xpNeededFor(this.level), agility: this.agility, spirit: this.spirit,
      spendEnergy: this.spendEnergy, banked: this.banked, echoes: this.echoes, spawnInterval: this.spawnInterval,
      travelerCount: live.length, kinds: live.map((t) => t.kind),
      choice: this.choice ? { remaining: this.choice.remaining, payload: [...this.choice.payload], queued: this.choice.queued.map((d) => [...d]) } : null,
      encounter: this.encounter ? { queued: this.encounter.queuedLoot.length, loot: [...this.encounter.loot], queuedLoot: this.encounter.queuedLoot.map((d) => [...d]), battle: this.encounter.battle ? { ...this.encounter.battle, lines: [...this.encounter.battle.lines] } : null } : null,
      worldOffset: this.worldOffset, lastOpen: [...this.lastOpen], echoFx: Boolean(this.echoFx), log: this.log.map((l) => l.text),
    };
  }

  // --- Asset Loading & Persistence -------------------------------------
  loadSprites() {
    if (typeof Image === "undefined") return Promise.resolve();
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(src));
        img.src = src;
      });
    return Promise.all([
      load("/sprites/background.png"), load("/sprites/pup-walk.png"), load("/sprites/pup-idle.png"),
    ]).then(([bg, walk, idle]) => {
      this.bgImg = bg; this.walkImg = walk; this.idleImg = idle;
      this.spritesReady = true; this.hudDirty = true;
    });
  }
}