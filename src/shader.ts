// shader.js is taken from github user Twinklebear: https://github.com/Twinklebear/webgl-util

// Compile and link the shaders vert and frag. vert and frag should contain
// the shader source code for the vertex and fragment shaders respectively
// Returns the compiled and linked program, or null if compilation or linking failed
export const compileShader = function (gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  if (vs === null) {
    throw new Error('could not create vertex shader')
  }

  gl.shaderSource(vs, vert)
  gl.compileShader(vs)
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vs))
    throw new Error('Vertex shader failed to compile, see console for log')
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  if (fs === null) {
    throw new Error('could not create fragment shader')
  }

  gl.shaderSource(fs, frag)
  gl.compileShader(fs)
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fs))
    throw new Error('Fragment shader failed to compile, see console for log')
  }

  const program = gl.createProgram()
  if (program === null) {
    throw new Error('could not create GL program')
  }

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    throw new Error('Shader failed to link, see console for log')
  }
  return program
}

export const getGLExtension = function (gl: WebGL2RenderingContext, ext: string): boolean {
  if (!gl.getExtension(ext)) {
    console.error('Missing ' + ext + ' WebGL extension')
    return false
  }
  return true
}

export class Shader {
  program: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | null> = {}
  isMatcap?: boolean

  // TODO split these up into multiple shader sub-classes?
  clipPlaneClrLoc: WebGLUniformLocation | null = null
  mvpLoc: WebGLUniformLocation | null = null
  drawOpacityLoc: WebGLUniformLocation | null = null
  normLoc: WebGLUniformLocation | null = null
  opacityLoc: WebGLUniformLocation | null = null
  screenPxRangeLoc: WebGLUniformLocation | null = null
  fontColorLoc: WebGLUniformLocation | null = null
  canvasWidthHeightLoc: WebGLUniformLocation | null = null
  leftTopWidthHeightLoc: WebGLUniformLocation | null = null
  uvLeftTopWidthHeightLoc?: WebGLUniformLocation | null = null
  backgroundMasksOverlaysLoc: WebGLUniformLocation | null = null
  renderOverlayBlendLoc: WebGLUniformLocation | null = null
  mvpMatRASLoc: WebGLUniformLocation | null = null
  rayDirLoc: WebGLUniformLocation | null = null
  clipPlaneLoc: WebGLUniformLocation | null = null
  isAlphaClipDarkLoc: WebGLUniformLocation | null = null
  overlayAlphaShaderLoc: WebGLUniformLocation | null = null
  overlayOutlineWidthLoc: WebGLUniformLocation | null = null
  axCorSagLoc: WebGLUniformLocation | null = null
  sliceLoc: WebGLUniformLocation | null = null
  frac2mmLoc: WebGLUniformLocation | null = null
  lineColorLoc: WebGLUniformLocation | null = null
  thicknessLoc: WebGLUniformLocation | null = null
  startXYendXYLoc: WebGLUniformLocation | null = null
  startXYLoc: WebGLUniformLocation | null = null
  endXYZLoc: WebGLUniformLocation | null = null
  circleColorLoc: WebGLUniformLocation | null = null
  fillPercentLoc: WebGLUniformLocation | null = null
  colorLoc: WebGLUniformLocation | null = null
  layerLoc: WebGLUniformLocation | null = null

  constructor(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string) {
    this.program = compileShader(gl, vertexSrc, fragmentSrc)

    const regexUniform = /uniform[^;]+[ ](\w+);/g
    const matchUniformName = /uniform[^;]+[ ](\w+);/

    const vertexUnifs = vertexSrc.match(regexUniform)
    const fragUnifs = fragmentSrc.match(regexUniform)

    if (vertexUnifs) {
      vertexUnifs.forEach((unif) => {
        const m = unif.match(matchUniformName)
        this.uniforms[m![1]] = -1 // TODO can we guarantee this?
      })
    }
    if (fragUnifs) {
      fragUnifs.forEach((unif) => {
        const m = unif.match(matchUniformName)
        this.uniforms[m![1]] = -1 // TODO can we guarantee this?
      })
    }

    for (const unif in this.uniforms) {
      this.uniforms[unif] = gl.getUniformLocation(this.program, unif)!
    }
  }

  use(gl: WebGL2RenderingContext): void {
    gl.useProgram(this.program)
  }
}
