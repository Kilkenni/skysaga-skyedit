import { createRoot } from "react-dom/client";
//import "./styles/global.css";
import TerrainEditor from "./components/TerrainEditor";

const root = document.getElementById("root");
if(root !== null) 
  createRoot(root).render(<TerrainEditor />);
