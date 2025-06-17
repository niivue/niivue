export const uiFunction = () => 'Hello from UI Kit!'
export { UIKRenderer } from './uikrenderer'
export { UIKFont } from './assets/uikfont'
export * from './types'
// packages/uikit/src/index.ts

import { UIKRenderer } from './uikrenderer.js';
import { LineTerminator, LineStyle } from './types.js';

// Wait until DOM is ready
window.addEventListener('load', () => {
  // 1. Get the <canvas> element
  const canvas = document.getElementById('uikCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Cannot find <canvas id="uikCanvas"> in document.');
    return;
  }

  // 2. Initialize WebGL2 context
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL2 is not supported by your browser.');
    return;
  }

  // 3. Create the UIKRenderer instance
  const renderer = new UIKRenderer(gl);

  // 4. Clear the canvas to a light gray background
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 5. Draw a green circle in the top-left quadrant
  renderer.drawCircle({
    leftTopWidthHeight: [50, 50, 200, 200],      // x=50, y=50, width=200px, height=200px
    circleColor: [0.1, 0.8, 0.1, 1],              // RGBA (mostly green)
    fillPercent: 1.0,                             // full circle
    z: 0                                          // z-index = 0
  });

  // 6. Draw a red solid line across the middle
  renderer.drawLine({
    startEnd: [50, 300, 750, 300],                // from (50,300) → (750,300)
    thickness: 4,                                 // 4px thick
    color: [1, 0, 0, 1],                          // RGBA (red)
    terminator: LineTerminator.NONE,              // no arrowhead/circle
    style: LineStyle.SOLID,                       // one continuous strip
    dashDotLength: 5                              // ignored because style=SOLID
  });

  // 7. Draw a blue downward‐pointing triangle at center
  renderer.drawTriangle({
    headPoint: [400, 350],                        // apex at (400,350)
    baseMidPoint: [400, 500],                     // base midpoint at (400,500)
    baseLength: 150,                              // base is 150px wide
    color: [0, 0.2, 1, 1],                        // RGBA (blue)
    z: 0
  });

  // 8. Optionally: draw a dashed black diagonal with an arrow terminator
  renderer.drawLine({
    startEnd: [700, 100, 100, 500],                // from (700,100) → (100,500)
    thickness: 3,                                 // 3px thick
    color: [0, 0, 0, 1],                          // RGBA (black)
    terminator: LineTerminator.ARROW,             // arrowhead at endpoint
    style: LineStyle.DASHED,                      // dashed line
    dashDotLength: 20                             // each dash is 20px
  });
});