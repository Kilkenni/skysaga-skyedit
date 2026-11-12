import { orientationXZ } from "../lib/entities";

function drawEntityGlyph(
  ctx: CanvasRenderingContext2D,
  cell: number,          // pixel size of one grid cell
  x: number,
  z: number,
  color: string,         // CSS colour
  yaw: number,
  alpha: number,
  ghost = false          // true = the shadow style: hollow, dashed
): void {
  const cx = x * cell + cell / 2;
  const cz = z * cell + cell / 2;
  const r = cell * 0.38;
  const f = orientationXZ(yaw);

  ctx.save();                 // so alpha and dash settings can't leak to the next drawing
  ctx.globalAlpha = alpha;
  if (ghost)
    ctx.setLineDash([4, 3]);

  // facing tick first, so the origin marker covers its start
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cz);
  ctx.lineTo(cx + f.x * cell * 0.7, cz + f.z * cell * 0.7);
  ctx.stroke();

  // origin marker as a diamond shape
  ctx.beginPath();
  ctx.moveTo(cx, cz - r);
  ctx.lineTo(cx + r, cz);
  ctx.lineTo(cx, cz + r);
  ctx.lineTo(cx - r, cz);
  ctx.closePath();
  if (ghost) {
    ctx.lineWidth = 1.5;
    ctx.stroke();             // outline in the category colour, no fill
  } else {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#2a0a17";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore(); // restore globalAlpha value as it was before the glyph 
}

export {
  drawEntityGlyph,
}
