import { SpiritWalk } from "./components/spirit-walk";
import { useState } from "react";
import { HomeScreen } from "./components/home-screen";

export default function App() {
  const [view, setView] = useState<"home" | "adventure">("home");
  return view === "home"
    ? <HomeScreen onGoAdventure={() => setView("adventure")} />
    : <SpiritWalk onGoHome={() => setView("home")} />;
}
