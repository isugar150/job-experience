import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { cssUrlWithBase } from "./lib/assets";

document.documentElement.style.setProperty(
  "--paper-texture-url",
  cssUrlWithBase("/paper_texture.png")
);

createRoot(document.getElementById("root")!).render(<App />);
