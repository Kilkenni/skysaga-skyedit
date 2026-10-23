import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import TerrainEditor from "./components/TerrainEditor";

createRoot(document.getElementById("root")).render(<TerrainEditor />);
