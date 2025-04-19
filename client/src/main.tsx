import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@/lib/utils"; // Ensure utils are loaded

createRoot(document.getElementById("root")!).render(<App />);
