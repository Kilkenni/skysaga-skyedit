import React from "react";
import { createRoot } from "react-dom/client";
import "./lib/storagePolyfill"; // window.storage -> localStorage when not running inside Claude
import "./styles/global.css";
import TerrainEditor from "./components/TerrainEditor";

createRoot(document.getElementById("root")).render(<TerrainEditor />);
