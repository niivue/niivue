import { UIKRenderer } from './uikrenderer.js'
import { UIKFont } from './assets/uikfont.js'
import { LineTerminator, LineStyle, Vec2 } from './types.js'
import defaultFontPNG from './fonts/Roboto-Regular.png'
import defaultFontJSON from './fonts/Roboto-Regular.json' assert { type: 'json' }

window.addEventListener('load', async () => {
  const canvas = document.getElementById('uikCanvas') as HTMLCanvasElement
  if (!canvas) {
    console.error('Cannot find <canvas id="uikCanvas"> in document.')
    return
  }

  const gl = canvas.getContext('webgl2')
  if (!gl) {
    alert('WebGL2 is not supported by your browser.')
    return
  }

  const renderer = new UIKRenderer(gl)
  gl.clearColor(0.9, 0.9, 0.9, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  // 👉 Load and use UIKFont to draw text and ruler
  const font = new UIKFont(gl)
  const fontTexture = await font.loadFontTexture(defaultFontPNG)
  if(!fontTexture) {
    throw new Error(`texture not loaded from ${defaultFontPNG}`)
  }
  font.loadFromRawData(defaultFontJSON)

 
  

  renderer.drawCircle({
    leftTopWidthHeight: [50, 50, 200, 200],
    circleColor: [0.1, 0.8, 0.1, 1],
    fillPercent: 1.0,
    z: 0
  })

  renderer.drawLine({
    startEnd: [50, 300, 750, 300],
    thickness: 4,
    color: [1, 0, 0, 1],
    terminator: LineTerminator.NONE,
    style: LineStyle.SOLID
  })

  renderer.drawTriangle({
    headPoint: [500, 350],
    baseMidPoint: [500, 500],
    baseLength: 150,
    color: [0, 0.2, 1, 1],
    z: 0
  })

  renderer.drawLine({
    startEnd: [700, 100, 100, 500],
    thickness: 3,
    color: [0, 0, 0, 1],
    terminator: LineTerminator.ARROW,
    style: LineStyle.DASHED,
    dashDotLength: 20
  })

   // Draw a ruler between two points
  const pointA: Vec2 = [150, 600]
  const pointB: Vec2 = [650, 250]
  renderer.drawRuler({
    pointA,
    pointB,
    length: 42.68,
    units: 'mm',
    font,
    textColor: [0.1, 0.1, 0.1, 1],
    lineColor: [0.2, 0.2, 0.2, 1],
    lineThickness: 2,
    offset: 40,
    scale: 0.03
  })

  // Draw rotated text
  renderer.drawRotatedText({
    font,
    xy: [300, 100],
    str: 'Rotated Text',
    scale: 0.03,
    color: [0.2, 0.2, 0.2, 1],
    rotation: Math.PI / 8
  })

  
  // gl.enable(gl.DEPTH_TEST);                     // turn depth-testing back on (if you ever need it)
  // gl.enable(gl.CULL_FACE);                      // restore face-culling (if you ever had it)
  // gl.disable(gl.BLEND);                         // turn off blending
})
