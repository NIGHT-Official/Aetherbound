import { useState } from "react";
import { HomeScreen } from "./components/home-screen";
import { SpiritWalk } from "./components/spirit-walk";
import { SpiritGame } from "./game/adventurebound";

export default function App() {
  const [view, setView] = useState<"home" | "adventure">("home");
  const [game] = useState(() => new SpiritGame());

  return view === "home"
    ? <HomeScreen game={game} onGoAdventure={() => setView("adventure")} />
    : (
      <SpiritWalk
        game={game}
        onGoHome={() => {
          game.setAdventure(false); // going Home always makes camp first
          setView("home");
        }}
      />
    );
}
