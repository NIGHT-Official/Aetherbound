import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { HOME_H, HOME_W, HomeSim, updateWashTool, type SoapStyle } from "@/game/home";
import { PUP_CELL, type SpiritGame } from "@/game/adventurebound";
import { formatDuration, formatHoursMinutes } from "@/lib/utils";
import { RadialMenu } from "@/components/radial-menu";
import { BuffChip } from "@/components/buff-chip";
import { Button } from "@/components/ui/button";


function toRoomCoords(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width;
  const cssH = rect.height;
  const scale = Math.min(cssW / HOME_W, cssH / HOME_H);
  const ox = (cssW - HOME_W * scale) / 2;
  const oy = (cssH - HOME_H * scale) / 2;
  return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
}


export function HomeScreen({ game, onGoAdventure, onGoYard }: { game: SpiritGame; onGoAdventure: () => void; onGoYard: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<HomeSim | null>(null);
  const buffRef = useRef<HTMLSpanElement | null>(null);
  const lockRef = useRef<HTMLButtonElement | null>(null);
  const washBarRef = useRef<HTMLDivElement | null>(null);
  const rinseBarRef = useRef<HTMLDivElement | null>(null);
  const washPhaseRef = useRef<HTMLParagraphElement | null>(null);
  const washCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [careRingOpen, setCareRingOpen] = useState(false);
  const [washStep, setWashStep] = useState<'none' | 'soap' | 'scrub' | 'done'>('none');
  const washPointerRef = useRef({ down: false, x: 0, y: 0 });
  const washStepRef = useRef(washStep);
  const [chosenScent, setChosenScent] = useState<SoapStyle>('none');
  const chosenScentRef = useRef(chosenScent);
  const [washResult, setWashResult] = useState<{
    magnitude: number;
    durationMs: number;
    cooldownMs: number;
    scent: SoapStyle;
    soapCount: number;
  } | null>(null);
  const [pupBuffs, setPupBuffs] = useState({
    brushRemainingMs: 0,
    washRemainingMs: 0,
    washCooldownRemainingMs: 0,
    soapCount: 0,
  });

  useEffect(() => { washStepRef.current = washStep; }, [washStep]);
  useEffect(() => { chosenScentRef.current = chosenScent; }, [chosenScent]);

  useEffect(() => {
    if (!careRingOpen) return;
    const tick = () => {
      const sim = simRef.current;
      if (!sim) return;
      const now = Date.now();
      setPupBuffs({
        brushRemainingMs: sim.pup.brushBuffUntil - now,
        washRemainingMs: sim.pup.washBuffUntil - now,
        washCooldownRemainingMs: sim.pup.washCooldownUntil - now,
        soapCount: sim.soapCount,
      });
    };
    tick(); // populate immediately on open, dont wait a full second
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [careRingOpen]);

  useEffect(() => {
    if (washStep === 'scrub') {
      simRef.current?.startWashing();
    }
  }, [washStep]);


  useEffect(() => {
    const sim = new HomeSim();
    simRef.current = sim;
    sim.onPupTapped = () => setCareRingOpen(true);
    sim.onFed = () => game.applyEnergyRegenBuff();
    sim.isWellFed = () => Date.now() < game.regenBuffUntil;
    sim.onDoorTapped = onGoYard;
    void sim.loadSprites().catch(() => undefined);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
      const scale = Math.min(cssW / HOME_W, cssH / HOME_H);   // min = contain
      const ox = (cssW - HOME_W * scale) / 2;
      const oy = (cssH - HOME_H * scale) / 2;
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
      sim.tick(dt);

      if (washStepRef.current === 'scrub' && sim.washTool) {
        const tool = sim.washTool; // capture now — completeWash() may null sim.washTool during the call below
        const wp = washPointerRef.current;
        const done = updateWashTool(tool, 96, 96, wp.down, wp.x, wp.y, dt, () => {
          sim.completeWash(chosenScentRef.current);
        });

        if (washBarRef.current) {
          const frac = tool.phase === 'lather'
            ? Math.min(1, tool.totalSweepDeg / tool.targetSweepDeg)
            : 1;
          washBarRef.current.style.width = `${frac * 100}%`;
        }
        if (rinseBarRef.current) {
          const rinseFrac = tool.phase === 'rinse'
            ? Math.min(1, tool.rinseTimer / tool.targetRinseTime)
            : 0;
          rinseBarRef.current.style.width = `${rinseFrac * 100}%`;
        }
        if (washPhaseRef.current) {
          washPhaseRef.current.textContent = tool.phase === 'lather'
            ? 'Scrub in circles...'
            : tool.shookOff ? '*Shake Shake*' : 'Hold to rinse...';
        }

        if (done) {
          const result = {
            magnitude: sim.pup.washBuffMagnitude,
            durationMs: sim.pup.washBuffUntil - Date.now(),
            cooldownMs: sim.pup.washCooldownUntil - Date.now(),
            scent: sim.pup.soapStyle,
            soapCount: sim.soapCount,
          };
          setTimeout(() => {
            setWashResult(result);
            setWashStep('done');
          }, 400);
        }
      }

      const wctx = washCanvasRef.current?.getContext("2d");
      if (wctx) {
        wctx.imageSmoothingEnabled = false;
        wctx.clearRect(0, 0, 192, 192);

        // placeholder tub — flat shapes standing in for real art
        wctx.fillStyle = "#6b7280";
        wctx.beginPath();
        wctx.ellipse(96, 130, 80, 50, 0, 0, Math.PI * 2);
        wctx.fill();
        wctx.fillStyle = "#93c5fd";
        wctx.beginPath();
        wctx.ellipse(96, 122, 65, 38, 0, 0, Math.PI * 2);
        wctx.fill();

        if (sim.idleImg) {
          const frame = Math.floor(sim.time * 6) % 12;
          const dw = PUP_CELL * 4;
          wctx.drawImage(sim.idleImg, frame * PUP_CELL, 0, PUP_CELL, PUP_CELL, 96 - dw / 2, 90 - dw / 2, dw, dw);
        }
      }


      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      sim.draw(ctx);

      if (buffRef.current) {
        const remaining = Math.max(0, game.regenBuffUntil - Date.now());
        buffRef.current.textContent = remaining > 0 ? `Well Fed . ${formatDuration(remaining)}` : "";
      }

      if (lockRef.current) {
        const following = sim.cameraFollow;
        lockRef.current.style.opacity = following ? ".5" : "1";
        lockRef.current.style.pointerEvents = following ? "none" : "auto";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      sim.persistNow();
    };
  }, [game]);

  return (
    <div className="flex h-dvh items-center justify-center bg-bg">
      <div
        className="relative w-full"
        style={{ maxWidth: "calc(100dvh * 360 / 713)", aspectRatio: "360 / 713" }}
      >
        <div ref={wrapRef} className="absolute inset-x-0 top-0" style={{ height: `${(640 / 713) * 100}%` }}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            onPointerDown={(e) => {
              if (!canvasRef.current) return;
              const { x, y } = toRoomCoords(canvasRef.current, e.clientX, e.clientY);
              simRef.current?.pointerDown(x, y);
            }}

            onPointerMove={(e) => {
              if (!canvasRef.current) return;
              const { x, y } = toRoomCoords(canvasRef.current, e.clientX, e.clientY);
              simRef.current?.pointerMove(x, y);
            }}
            onPointerUp={() => simRef.current?.pointerUp()}
            onPointerLeave={() => simRef.current?.pointerUp()}
          />

          <span
            ref={buffRef}
            className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-accent"
          />

          <button
            ref={lockRef}
            onClick={() => simRef.current?.lockCameraToPup()}
            aria-label="Follow pup"
            className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-2 text-white transition-opacity"
          >
            <Lock size={16} />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0" style={{ height: `${(73 / 713) * 100}%` }}>
          <img src="/sprites/menu-bar.png" className="h-full w-full" style={{ imageRendering: "pixelated" }} alt="" />
          <button className="absolute top-0 left-0 h-full w-1/4" aria-label="Market" disabled />
          <button className="absolute top-0 left-1/4 h-full w-1/4" aria-label="Home" disabled />
          <button className="absolute top-0 left-2/4 h-full w-1/4" aria-label="Adventure" onClick={onGoAdventure} />
          <button className="absolute top-0 left-3/4 h-full w-1/4" aria-label="Lab" disabled />
        </div>
      </div>
      {careRingOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCareRingOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-fg">Sol</p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <BuffChip label="Brushed" remainingMs={pupBuffs.brushRemainingMs} />
              <BuffChip label="Washed" remainingMs={pupBuffs.washRemainingMs} />
            </div>

            <div className="mt-4 flex justify-center">
              <RadialMenu
                radius={80}
                center={<span className="text-xs">pup</span>}
                items={[
                  {
                    id: "pet", label: "Pet", icon: "🖐", angleDeg: 0, status: "always-on",
                    onSelect: () => {
                      simRef.current?.startPetting();
                      setCareRingOpen(false);
                    },
                  },

                  {
                    id: "brush", label: "Brush", icon: "🧹", angleDeg: 240,
                    status: pupBuffs.brushRemainingMs > 0 ? "cooldown" : "ready",
                    cooldownLabel: pupBuffs.brushRemainingMs > 0 ? formatDuration(pupBuffs.brushRemainingMs)
                      : undefined,
                    onSelect: () => {
                      simRef.current?.startBrushing();
                      setCareRingOpen(false);
                    }
                  },

                  {
                    id: "wash", label: "Wash", icon: "🛁", angleDeg: 120,
                    status: pupBuffs.washCooldownRemainingMs > 0 || pupBuffs.soapCount <= 0 ? "cooldown" : "ready",
                    cooldownLabel: pupBuffs.washCooldownRemainingMs > 0
                      ? formatDuration(pupBuffs.washCooldownRemainingMs)
                      : `soap ${pupBuffs.soapCount}`,
                    onSelect: () => {
                      setCareRingOpen(false);
                      setWashStep('soap');
                    }
                  },
                ]}
              />
            </div>

            <p className="mt-3 text-center text-[10px] text-muted">tap anywhere else to close</p>
          </div>
        </div>
      )}
      {washStep === 'soap' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <p className="text-sm font-medium text-fg">Choose soap</p>
            <p className="mt-1 text-[10px] text-muted">Soap remaining: {pupBuffs.soapCount}</p>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {(['none', 'sparkle', 'lightning', 'bubbles', 'ice', 'fire', 'water', 'earth'] as SoapStyle[]).map((scent) => (
                <button
                  key={scent}
                  onClick={() => setChosenScent(scent)}
                  className={`rounded-md border px-2 py-2 text-[10px] capitalize ${chosenScent === scent ? "border-accent bg-accent/15 text-fg" : "border-border text-muted"
                    }`}
                >
                  {scent}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setWashStep('none')}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={pupBuffs.soapCount <= 0}
                onClick={() => setWashStep('scrub')}
              >
                Into the tub
              </Button>
            </div>
          </div>
        </div>
      )}
      {washStep === 'scrub' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 pt-30">
          <div className="w-full max-w-sm p-4">
            <p className="text-sm font-medium text-fg">Scrub</p>
            <canvas
              ref={washCanvasRef}
              width={192}
              height={192}
              className="relative mx-auto mt-3 block h-48 w-48 touch-none"
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                washPointerRef.current = { down: true, x: e.clientX - rect.left, y: e.clientY - rect.top };
              }}
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                washPointerRef.current.x = e.clientX - rect.left;
                washPointerRef.current.y = e.clientY - rect.top;
              }}
              onPointerUp={() => { washPointerRef.current.down = false; }}
              onPointerLeave={() => { washPointerRef.current.down = false; }}
            />
            <p ref={washPhaseRef} className="mt-3 text-center text-xs text-muted">Scrub in circles...</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div ref={washBarRef} className="h-full bg-accent transition-[width]" style={{ width: "0%" }} />
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div ref={rinseBarRef} className="h-full bg-accent transition-[width]" style={{ width: "0%" }} />
            </div>

          </div>
        </div>
      )}
      {washStep === 'done' && washResult && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <p className="text-sm font-medium text-fg">Squeaky clean!</p>

            <div className="mt-3 space-y-1 text-xs text-muted">
              <p>Scent: <span className="capitalize text-fg">{washResult.scent}</span></p>
              <p>Echo-rate bonus: <span className="text-fg">+{Math.round(washResult.magnitude * 100)}%</span></p>
              <p>Lasts: <span className="text-fg">{formatHoursMinutes(washResult.durationMs)}</span></p>
              <p>Next wash available in: <span className="text-fg">{formatHoursMinutes(washResult.cooldownMs)}</span></p>
              <p>Soap remaining: <span className="text-fg">{washResult.soapCount}</span></p>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                onClick={() => { setWashStep('none'); setWashResult(null); }}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

