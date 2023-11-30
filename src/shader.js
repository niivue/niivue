// shader.js is taken from github user Twinklebear: https://github.com/Twinklebear/webgl-util

// Compile and link the shaders vert and frag. vert and frag should contain
// the shader source code for the vertex and fragment shaders respectively
// Returns the compiled and linked program, or null if compilation or linking failed
export const compileShader = function (gl, vert, frag) {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vs, vert)
  gl.compileShader(vs)
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    alert('Vertex shader failed to compile, see console for log')
    console.log(gl.getShaderInfoLog(vs))
    return null
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(fs, frag)
  gl.compileShader(fs)
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    alert('Fragment shader failed to compile, see console for log')
    console.log(gl.getShaderInfoLog(fs))
    return null
  }

  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert('Shader failed to link, see console for log')
    console.log(gl.getProgramInfoLog(program))
    return null
  }
  return program
}

export const getGLExtension = function (gl, ext) {
  if (!gl.getExtension(ext)) {
    alert('Missing ' + ext + ' WebGL extension')
    return false
  }
  return true
}

/**
 * @class Shader
 * @type Shader
 * @constructor
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexSrc
 * @param {string} fragmentSrc
 */
export class Shader {
  constructor(gl, vertexSrc, fragmentSrc) {
    this.program = compileShader(gl, vertexSrc, fragmentSrc)

    const regexUniform = /uniform[^;]+[ ](\w+);/g
    const matchUniformName = /uniform[^;]+[ ](\w+);/

    this.uniforms = {}

    const vertexUnifs = vertexSrc.match(regexUniform)
    const fragUnifs = fragmentSrc.match(regexUniform)

    if (vertexUnifs) {
      vertexUnifs.forEach((unif) => {
        const m = unif.match(matchUniformName)
        this.uniforms[m[1]] = -1
      })
    }
    if (fragUnifs) {
      fragUnifs.forEach((unif) => {
        const m = unif.match(matchUniformName)
        this.uniforms[m[1]] = -1
      })
    }

    for (const unif in this.uniforms) {
      this.uniforms[unif] = gl.getUniformLocation(this.program, unif)
    }
  }

  use(gl) {
    gl.useProgram(this.program)
  }
}
