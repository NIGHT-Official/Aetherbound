import { Archive, Ear, Play, Shield, Square, Swords, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ENERGY_CAP,
  ENERGY_DRAIN_AMOUNT,
  ENERGY_DRAIN_PERIOD_SEC,
  hpMaxFor,
  SpiritGame,
  WORLD_H,
  WORLD_W,
  type HudSnapshot,
} from "@/game/adventurebound";

const emptyHud: HudSnapshot = {
  adventure: false,
  energy: ENERGY_CAP,
  hp: hpMaxFor(1),
  hpMax: hpMaxFor(1),
  level: 1,
  xp: 0,
  xpNeeded: 100,
  agility: 5,
  spirit: 5,
  spendEnergy: false,
  draining: false,
  spawnInterval: 20,
  banked: 0,
  choice: null,
  encounter: null,
  log: [],
  // ADD THESE THREE:
  graceTurns: 0,
  zealTurns: 0,
  playerStunned: false,
};

export function SpiritWalk() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<SpiritGame | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(emptyHud);

  // This useEffect acts as the "_ready()" function for the component
  useEffect(() => {
    const game = new SpiritGame();
    gameRef.current = game;
    
    // Accessibility check for reduced motion
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    game.setReducedMotion(reduced.matches);
    const onMotion = () => game.setReducedMotion(reduced.matches);
    reduced.addEventListener("change", onMotion);

    void game.loadSprites().catch(() => undefined);

    const canvas = canvasRef.current;
    if (!canvas) return () => reduced.removeEventListener("change", onMotion);
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => reduced.removeEventListener("change", onMotion);

    // Responsive scaling for the canvas
    const resize = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const scale = Math.max(cssW / WORLD_W, cssH / WORLD_H);
      const ox = (cssW - WORLD_W * scale) / 2;
      const oy = (cssH - WORLD_H * scale) / 2;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);

    // The Main Game Loop (equivalent to _process(delta))
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      game.tick(dt);
      ctx.clearRect(-20, -20, WORLD_W + 40, WORLD_H + 40);
      game.draw(ctx);
      
      // Only update the React UI if the engine flags a change
      if (game.hudDirty) {
        game.hudDirty = false;
        setHud(game.getHud());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    
    const flushSave = () => game.persistNow();
    document.addEventListener("visibilitychange", flushSave);
    window.addEventListener("pagehide", flushSave);

    // Cleanup when the component unmounts
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      reduced.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", flushSave);
      window.removeEventListener("pagehide", flushSave);
      game.persistNow();
    };
  }, []);

  const g = () => gameRef.current;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg md:h-dvh md:overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
            Early Access
          </p>
          <h1 className="font-display text-2xl tracking-tight text-fg italic md:text-3xl">
            Aetherbound
          </h1>
        </div>
        <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted sm:block">
          Walk in place. Motes ride the scroll. Bank them, or listen.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden px-3 pb-4 md:flex-row md:gap-4 md:overflow-hidden md:px-6 md:pb-6">
        <section
          ref={wrapRef}
          className="relative h-[42vh] min-h-55 overflow-hidden rounded-xl border border-border bg-playfield md:h-auto md:min-h-0 md:flex-1"
        >
          {/* THE CANVAS ENGINE RENDERS HERE */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            aria-label="Aetherbound walk playfield"
          />

          {/* COMBAT OVERLAY */}
          {hud.encounter ? (
            <div
              className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-sm rounded-xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(92%,22rem)] md:-translate-x-1/2 md:-translate-y-1/2"
            >
              {hud.encounter.battle ? (
                <>
                  {/* FLOATING ACTION LOG (ABOVE CARD) */}
                  <div className="pointer-events-none absolute -top-36 inset-x-0 flex flex-col items-center justify-end gap-1.5 pb-2 text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                    {hud.encounter.battle.lines.slice(-4).map((line, idx, arr) => {
                      const isLatest = idx === arr.length - 1;
                      return (
                        <p
                          key={`${hud.encounter!.battle!.turn}-${idx}-${line}`}
                          className={cn(
                            "font-sans font-extrabold tracking-[0.16em] uppercase transition-all duration-200",
                            isLatest
                              ? "text-2xl text-[#ff4d4d] scale-105 drop-shadow-[0_0_12px_rgba(255,77,77,0.4)]"
                              : "text-m text-[#8a2424]"
                          )}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>

                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    Battle · Turn {hud.encounter.battle.turn}
                  </p>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-medium tracking-wide text-[#8a2424]">
                        {hud.encounter.battle.type}
                      </span>
                      <span className="font-mono text-l tabular-nums text-fg">
                        {hud.encounter.battle.enemyHp}/{hud.encounter.battle.enemyMax}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-danger"
                        style={{
                          width: `${Math.min(100, (hud.encounter.battle.enemyHp / hud.encounter.battle.enemyMax) * 100)}%`,
                        }}
                      />
                    </div>
                    {hud.graceTurns > 0 && (
                      <p className="mt-2 text-xs text-ok">
                        Grace Active · {hud.graceTurns} turn{hud.graceTurns === 1 ? "" : "s"}
                      </p>
                    )}
                    {hud.zealTurns > 0 && (
                      <p className="mt-2 text-xs text-accent">
                        Zeal Active · {hud.zealTurns} turn{hud.zealTurns === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>

                  {/* JRPG COMBAT MENU */}
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {/* PHYSICAL COLUMN */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Physical</span>
                      <Button type="button" onClick={() => { g()?.unlockAudio(); g()?.battleAction("atk"); }}>
                        <Swords /> ATTACK
                      </Button>
                      {hud.encounter.battle.charging !== null && hud.zealTurns > 0 && (
                        <Button type="button" variant="danger" onClick={() => { g()?.unlockAudio(); g()?.battleAction("stun"); }}>
                          [ STUN ]
                        </Button>
                      )}
                    </div>

                    {/* AGILITY COLUMN */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Agility</span>
                      <Button type="button" variant="outline" onClick={() => { g()?.unlockAudio(); g()?.battleAction("eva"); }}>
                        <Shield /> EVADE
                      </Button>
                    </div>

                    {/* SPIRIT COLUMN */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Spirit</span>
                      <Button type="button" variant="outline" onClick={() => { g()?.unlockAudio(); g()?.battleAction("grace"); }}>
                        <Wand2 /> GRACE
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { g()?.unlockAudio(); g()?.battleAction("zeal"); }}>
                        <Wand2 /> ZEAL
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    className="mt-4 w-full"
                    onClick={() => { g()?.unlockAudio(); g()?.runEncounter(); }}
                  >
                    Run
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">Encounter</p>
                  <p className="mt-1 font-display text-2xl italic">Fight or run</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Fight opens a text battle. Run ends the walk and drops half the bank.
                    {hud.encounter.queued > 0 ? ` ${hud.encounter.queued} more waiting.` : ""}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button type="button" onClick={() => { g()?.unlockAudio(); g()?.fightEncounter(); }}>
                      <Swords /> Fight
                    </Button>
                    <Button type="button" variant="danger" onClick={() => { g()?.unlockAudio(); g()?.runEncounter(); }}>
                      Run
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : hud.choice ? (
            <div
              className="absolute inset-x-3 bottom-3 z-10 mx-auto max-w-sm rounded-xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(92%,22rem)] md:-translate-x-1/2 md:-translate-y-1/2"
            >
              <p className="text-xs font-medium tracking-wide text-muted uppercase">This mote</p>
              <p className="mt-1 font-display text-2xl italic">Bank / Listen</p>
              <p className="mt-1 font-mono text-sm tabular-nums text-fg">
                {hud.choice.remaining.toFixed(1)}s
                {hud.choice.queued.length > 0 ? ` · ${hud.choice.queued.length} waiting` : ""}
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full bg-accent" style={{ width: `${(hud.choice.remaining / 5) * 100}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => { g()?.unlockAudio(); g()?.chooseBank(); }}>
                  <Archive /> Bank
                </Button>
                <Button type="button" onClick={() => { g()?.unlockAudio(); g()?.chooseListen(); }}>
                  <Ear /> Listen
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        {/* SIDEBAR HUD */}
        <aside className="flex w-full shrink-0 flex-col gap-3 md:h-full md:w-80 md:min-h-0 md:overflow-hidden">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">Adventure</span>
              <span className={cn("font-mono text-sm tabular-nums", hud.adventure ? "text-ok" : "text-muted")}>
                {hud.adventure ? "ON" : "OFF"}
              </span>
            </div>
            <Button
              type="button"
              className="mt-3 w-full"
              variant={hud.adventure ? "danger" : "default"}
              disabled={Boolean(hud.encounter)}
              onClick={() => { g()?.unlockAudio(); g()?.setAdventure(!hud.adventure); }}
            >
              {hud.adventure ? <Square /> : <Play />}
              {hud.adventure ? "Make Camp" : "Adventure"}
            </Button>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium tracking-wide text-muted uppercase">Level {hud.level}</span>
                <span className="font-mono text-sm tabular-nums text-fg">{hud.xp}/{hud.xpNeeded} XP</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-fg" style={{ width: `${Math.min(100, (hud.xp / hud.xpNeeded) * 100)}%` }} />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-mono text-xs tabular-nums text-muted">AGI {hud.agility}</span>
                <span className="font-mono text-xs tabular-nums text-muted">SPR {hud.spirit}</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium tracking-wide text-muted uppercase">HP</span>
                <span className="font-mono text-sm tabular-nums text-fg">{hud.hp}/{hud.hpMax}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn("h-full", hud.hp / hud.hpMax <= 0.25 ? "bg-danger" : "bg-ok")}
                  style={{ width: `${Math.min(100, (hud.hp / hud.hpMax) * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium tracking-wide text-muted uppercase">Energy</span>
                <span className="font-mono text-sm tabular-nums text-fg">{hud.energy}/{ENERGY_CAP}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-accent" style={{ width: `${(hud.energy / ENERGY_CAP) * 100}%` }} />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">Spend Energy</span>
              <button
                type="button"
                role="switch"
                aria-checked={hud.spendEnergy}
                onClick={() => { g()?.unlockAudio(); g()?.toggleSpend(); }}
                className={cn(
                  "relative h-11 w-18 rounded-md border text-xs font-medium tabular-nums",
                  hud.spendEnergy ? "border-accent bg-accent text-accent-fg" : "border-border bg-transparent text-muted"
                )}
              >
                {hud.spendEnergy ? "ON" : "OFF"}
              </button>
            </div>
            <p className="mt-2 text-xs text-subtle">
              Drain {ENERGY_DRAIN_AMOUNT} / {ENERGY_DRAIN_PERIOD_SEC}s while adventuring. Energy speeds spawn.
            </p>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">Spawn interval</span>
              <span className="font-mono text-sm tabular-nums text-fg">{hud.spawnInterval.toFixed(1)}s</span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">Bank</span>
              <span className="font-mono text-sm tabular-nums text-fg">{hud.banked}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              disabled={hud.banked <= 0 || Boolean(hud.encounter)}
              onClick={() => { g()?.unlockAudio(); g()?.listenFromBank(); }}
            >
              <Ear /> Listen from bank
            </Button>
          </div>

          <div className="max-h-40 min-h-0 overflow-y-auto rounded-xl border border-border bg-surface p-4 md:max-h-none md:flex-1">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Log</p>
            <ul className="mt-2 space-y-1.5 font-mono text-xs leading-snug text-muted">
              {hud.log.map((line) => (
                <li key={line.id} className="text-pretty">{line.text}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <footer className="flex shrink-0 items-center justify-end px-4 pb-3 md:px-6">
        <button
          type="button"
          onClick={() => {
            g()?.unlockAudio();
            g()?.resetSave();
            setHud(g()?.getHud() ?? emptyHud);
          }}
          className="text-[11px] tracking-wide text-subtle uppercase hover:text-muted"
        >
          Reset Save
        </button>
      </footer>
    </div>
  );
}