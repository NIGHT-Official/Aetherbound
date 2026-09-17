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
  graceTurns: 0,
  zealTurns: 0,
  playerStunned: false,
};

const MIN_PANEL_HEIGHT = 140;
const MAX_PANEL_HEIGHT = 320;

export function SpiritWalk() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<SpiritGame | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(emptyHud);

  // Mobile Drawer Rail State
  const [isMobile, setIsMobile] = useState(false);
  const [panelHeight, setPanelHeight] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const startHeight = useRef(panelHeight);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    startHeight.current = panelHeight;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    const targetHeight = startHeight.current - deltaY;
    const maxAllowed = Math.min(window.innerHeight * 0.75, MAX_PANEL_HEIGHT);
    const clamped = Math.min(Math.max(targetHeight, MIN_PANEL_HEIGHT), maxAllowed);
    setPanelHeight(clamped);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const midpoint = (MIN_PANEL_HEIGHT + MAX_PANEL_HEIGHT) / 2;
    if (panelHeight < midpoint) {
      setPanelHeight(MIN_PANEL_HEIGHT);
    } else {
      setPanelHeight(MAX_PANEL_HEIGHT);
    }
  };

  // Main Game Loop & Canvas Setup
  useEffect(() => {
    const game = new SpiritGame();
    gameRef.current = game;

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

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      game.tick(dt);
      ctx.clearRect(-20, -20, WORLD_W + 40, WORLD_H + 40);
      game.draw(ctx);

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
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-bg text-fg select-none">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-2 md:py-3 md:px-6">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
            Early Access
          </p>
          <h1 className="font-display text-xl tracking-tight text-fg italic md:text-3xl">
            Aetherbound
          </h1>
        </div>
        <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted sm:block">
          Walk in place. Motes ride the scroll. Bank them, or listen.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-2 pb-2 md:flex-row md:gap-4 md:px-6 md:pb-6">
        {/* RESPONSIVE PLAYFIELD CANVAS */}
        <section
          ref={wrapRef}
          className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-playfield"
        >
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
                  <div className="pointer-events-none absolute -top-18 md:-top-20 inset-x-0 flex flex-col items-center justify-end gap-1 pb-1 text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    {hud.encounter.battle.lines.slice(-3).map((line, idx, arr) => {
                      const isLatest = idx === arr.length - 1;
                      return (
                        <p
                          key={`${hud.encounter!.battle!.turn}-${idx}-${line}`}
                          className={cn(
                            "font-sans font-extrabold tracking-wider uppercase transition-all duration-150",
                            isLatest
                              ? "text-sm sm:text-base md:text-xl text-[#ff4d4d] drop-shadow-[0_0_8px_rgba(255,77,77,0.4)]"
                              : "text-[11px] sm:text-xs md:text-sm text-[#8a2424]"
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

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Agility</span>
                      <Button type="button" variant="outline" onClick={() => { g()?.unlockAudio(); g()?.battleAction("eva"); }}>
                        <Shield /> EVADE
                      </Button>
                    </div>

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

        {/* DRAGGABLE MOBILE RAIL / DESKTOP SIDEBAR */}
        <aside
          style={isMobile ? { height: `${panelHeight}px` } : undefined}
          className={cn(
            "flex shrink-0 flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl",
            "md:h-full md:w-80 md:min-h-0 md:rounded-xl md:border-border md:bg-transparent md:shadow-none",
            isDragging ? "transition-none" : "transition-[height] duration-200 ease-out"
          )}
        >
          {/* DRAG HANDLE BAR (MOBILE ONLY) */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex md:hidden w-full flex-col items-center justify-center pt-2.5 pb-2 cursor-grab active:cursor-grabbing touch-none select-none border-b border-border/50 bg-surface-2/40"
          >
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <div className="mt-1 flex w-full items-center justify-between px-4 text-[10px] font-mono uppercase tracking-wider text-muted">
              <span>{panelHeight <= 80 ? `HP: ${hud.hp}/${hud.hpMax}` : "Touch Rail"}</span>
              <span className="font-semibold text-accent">
                {panelHeight <= 80 ? `Bank: ${hud.banked}` : (panelHeight < 220 ? "Drag Up for Stats" : "Drag Down to View")}
              </span>
            </div>
          </div>

          {/* INNER SCROLLING STATS & BANK */}
          <div className="flex-1 overflow-y-auto space-y-3 p-3 md:p-0">
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

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Log</p>
              <ul className="mt-2 space-y-1.5 font-mono text-xs leading-snug text-muted">
                {hud.log.map((line) => (
                  <li key={line.id} className="text-pretty">{line.text}</li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex shrink-0 items-center justify-end px-4 pb-2 md:px-6 md:pb-3">
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