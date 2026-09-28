import { useState } from "react";
import { HomeScreen } from "./components/home-screen";
import { SpiritWalk } from "./components/spirit-walk";
import { SpiritGame } from "./game/adventurebound";

export default function App() {
  const [view, setView] = useState<"home" | "adventure" | "yard">("home");
  const [game] = useState(() => new SpiritGame());

  if (view === "yard") return <YardScreen onGoHome={() => setView("home")} />;
  return view === "home"
    ? <HomeScreen game={game} onGoAdventure={() => setView("adventure")} onGoYard={() => setView("yard")} />
    : <SpiritWalk game={game} onGoHome={() => { game.setAdventure(false); setView("home"); }} />;
  }

export function YardScreen({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-bg text-fg">
      <p className="text-xs uppercase tracking-wide text-muted">Yard</p>
      <p className="text-lg">Coming soon.</p>
      <button onClick={onGoHome} className="underline">Back home</button>
    </div>
  );
}
