import { Log } from './utilities/log'

// Helper function to compile a shader
export const compileShader = function (
    gl: WebGL2RenderingContext,
    vert: string,
    frag: string
  ): WebGLProgram {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    if (!vs) {
      throw new Error('Failed to create vertex shader')
    }
    gl.shaderSource(vs, vert)
    gl.compileShader(vs)
  
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      Log.error('Vertex shader compilation error:', gl.getShaderInfoLog(vs))
      gl.deleteShader(vs)
      throw new Error('Vertex shader failed to compile')
    }
  
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    if (!fs) {
      gl.deleteShader(vs) // Clean up the vertex shader if fragment shader creation fails
      throw new Error('Failed to create fragment shader')
    }
    gl.shaderSource(fs, frag)
    gl.compileShader(fs)
  
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      Log.error('Fragment shader compilation error:', gl.getShaderInfoLog(fs))
      gl.deleteShader(fs)
      gl.deleteShader(vs) // Clean up vertex shader if fragment shader compilation fails
      throw new Error('Fragment shader failed to compile')
    }
  
    const program = gl.createProgram()
    if (!program) {
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      throw new Error('Failed to create shader program')
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
  
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      Log.error('Program linking error:', gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      throw new Error('Program failed to link')
    }
  
    // Clean up shaders after linking
    gl.detachShader(program, vs)
    gl.detachShader(program, fs)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
  
    return program
  }
  

export class UIKShader {
  program: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | null> = {}

  constructor(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string) {
    this.program = compileShader(gl, vertexSrc, fragmentSrc)

    const uniformRegex = /uniform[^;]+[ ](\w+);/g
    const uniformNames = new Set<string>()
    let match

    // Extract uniforms from vertex shader
    while ((match = uniformRegex.exec(vertexSrc)) !== null) {
      uniformNames.add(match[1])
    }

    // Extract uniforms from fragment shader
    while ((match = uniformRegex.exec(fragmentSrc)) !== null) {
      uniformNames.add(match[1])
    }

    // Get uniform locations
    uniformNames.forEach((name) => {
      const location = gl.getUniformLocation(this.program, name)
      if (location === null) {
        Log.warn(`Uniform ${name} is declared but not used in the shader`)
      }
      this.uniforms[name] = location
    })
  }

  use(gl: WebGL2RenderingContext): void {
    gl.useProgram(this.program)
  }

  setUniform(gl: WebGL2RenderingContext, name: string, value: any): void {
    const location = this.uniforms[name]
    if (location === null || location === undefined) {
      Log.error(`Uniform ${name} not found or unused`)
      return
    }
    // Handle uniform types
    if (Array.isArray(value)) {
      if (value.length === 16) gl.uniformMatrix4fv(location, false, value) // MVP matrix
      else if (value.length === 4) gl.uniform4fv(location, value)
      else if (value.length === 3) gl.uniform3fv(location, value)
      else if (value.length === 2) gl.uniform2fv(location, value)
    } else if (typeof value === 'number') {
      gl.uniform1f(location, value)
    } else {
      Log.error(`Unsupported uniform type for ${name}`)
    }
  }
}
