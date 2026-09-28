import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { HOME_H, HOME_W, HomeSim } from "@/game/home";
import type { SpiritGame } from "@/game/adventurebound";
import { formatDuration } from "@/lib/utils";


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

  useEffect(() => {
    const sim = new HomeSim();
    simRef.current = sim;
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
    </div>
  );

}

