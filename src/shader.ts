// shader.js is taken from github user Twinklebear: https://github.com/Twinklebear/webgl-util

// Compile and link the shaders vert and frag. vert and frag should contain
// the shader source code for the vertex and fragment shaders respectively
// Returns the compiled and linked program, or null if compilation or linking failed
export const compileShader = function (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  if (vs === null) {
    throw new Error('could not instantiate vertex shader')
  }

  gl.shaderSource(vs, vertexSource)
  gl.compileShader(vs)
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vs))
    throw new Error('Vertex shader failed to compile, see console for log')
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  if (fs === null) {
    throw new Error('could not instantiate fragment shader')
  }

  gl.shaderSource(fs, fragmentSource)
  gl.compileShader(fs)
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fs))
    throw new Error('Fragment shader failed to compile, see console for log')
  }

  const program = gl.createProgram()
  if (program === null) {
    throw new Error('could not create webgl program')
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
    alert('Missing ' + ext + ' WebGL extension')
    return false
  }
  return true
}

export class Shader {
  program: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | -1> = {}

  constructor(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
    this.program = compileShader(gl, vertexSource, fragmentSource)

    const regexUniform = /uniform[^;]+[ ](\w+);/g
    const matchUniformName = /uniform[^;]+[ ](\w+);/

    const vertexUnifs = vertexSource.match(regexUniform)
    const fragUnifs = fragmentSource.match(regexUniform)

    if (vertexUnifs) {
      vertexUnifs.forEach((unif) => {
        const m = unif.match(matchUniformName)
        if (m === null || m.length < 2) {
          throw new Error(`invalid vertex unif: ${unif}`)
        }
        this.uniforms[m[1]] = -1
      })
    }
    if (fragUnifs) {
      fragUnifs.forEach((unif) => {
        const m = unif.match(matchUniformName)
        if (m === null || m.length < 2) {
          throw new Error(`invalid fragment unif: ${unif}`)
        }
        this.uniforms[m[1]] = -1
      })
    }

    for (const unif in this.uniforms) {
      const uniformLocation = gl.getUniformLocation(this.program, unif)
      if (uniformLocation === null) {
        throw new Error(`could not get uniform location: ${unif}`)
      }
      this.uniforms[unif] = uniformLocation
    }
  }

  use(gl: WebGL2RenderingContext): void {
    gl.useProgram(this.program)
  }
}
