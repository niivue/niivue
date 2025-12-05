/**
 * Mesh management functions for handling mesh arrays and core mesh operations.
 * This module provides pure functions for mesh array manipulation.
 */

import type { NVMesh, NVMeshLayer } from '@/nvmesh'
import type { ColorMap } from '@/colortables'
import type { LegacyConnectome } from '@/types'
import { log } from '@/logger'

/**
 * Result of adding a mesh
 */
export interface AddMeshResult {
    meshes: NVMesh[]
    index: number
}

/**
 * Result of removing a mesh
 */
export interface RemoveMeshResult {
    meshes: NVMesh[]
    removed: NVMesh | null
}

/**
 * Result of setting/reordering a mesh
 */
export interface SetMeshResult {
    meshes: NVMesh[]
}

/**
 * Get the index of a mesh by its ID or index
 * @param meshes - Meshes array to search
 * @param id - Mesh ID (string) or index (number) to find
 * @returns Index of mesh, or -1 if not found
 */
export function getMeshIndexByID(meshes: NVMesh[], id: string | number): number {
    if (typeof id === 'number') {
        if (id >= meshes.length) {
            return -1
        }
        return id
    }
    for (let i = 0; i < meshes.length; i++) {
        if (meshes[i].id === id) {
            return i
        }
    }
    return -1
}

/**
 * Add a mesh to the meshes array
 * @param meshes - Current meshes array
 * @param mesh - Mesh to add
 * @returns New meshes array and index where mesh was added
 */
export function addMesh(meshes: NVMesh[], mesh: NVMesh): AddMeshResult {
    const newMeshes = [...meshes, mesh]
    const index = newMeshes.length === 1 ? 0 : newMeshes.length - 1
    return { meshes: newMeshes, index }
}

/**
 * Reorder a mesh to a new index position
 * @param meshes - Current meshes array
 * @param mesh - Mesh to reorder
 * @param toIndex - Target index (0 for front, -1 to remove, or valid index)
 * @returns New meshes array
 */
export function setMesh(meshes: NVMesh[], mesh: NVMesh, toIndex = 0): SetMeshResult {
    const numberOfLoadedMeshes = meshes.length
    if (toIndex > numberOfLoadedMeshes) {
        return { meshes }
    }

    const meshIndex = getMeshIndexByID(meshes, mesh.id)
    if (meshIndex < 0) {
        return { meshes }
    }

    const newMeshes = [...meshes]

    if (toIndex === 0) {
        // Move to front
        newMeshes.splice(meshIndex, 1)
        newMeshes.unshift(mesh)
    } else if (toIndex < 0) {
        // Remove mesh
        newMeshes.splice(meshIndex, 1)
    } else {
        // Move to specific index
        newMeshes.splice(meshIndex, 1)
        newMeshes.splice(toIndex, 0, mesh)
    }

    return { meshes: newMeshes }
}

/**
 * Remove a mesh from the meshes array
 * @param meshes - Current meshes array
 * @param mesh - Mesh to remove
 * @returns New meshes array and the removed mesh
 */
export function removeMesh(meshes: NVMesh[], mesh: NVMesh): RemoveMeshResult {
    const result = setMesh(meshes, mesh, -1)
    return {
        meshes: result.meshes,
        removed: mesh
    }
}

/**
 * Remove a mesh by its URL
 * @param meshes - Current meshes array
 * @param url - URL of mesh to find
 * @param mediaUrlMap - Map of media objects to URLs
 * @returns The mesh to remove, or null if not found
 */
export function findMeshByUrl(meshes: NVMesh[], url: string, mediaUrlMap: Map<object, string>): NVMesh | null {
    for (const mesh of meshes) {
        if (mediaUrlMap.get(mesh) === url) {
            return mesh
        }
    }
    return null
}

/**
 * Parameters for setMeshProperty
 */
export interface SetMeshPropertyParams {
    meshes: NVMesh[]
    id: number
    key: keyof NVMesh
    val: number | string | boolean | Uint8Array | number[] | ColorMap | LegacyConnectome | Float32Array
    gl: WebGL2RenderingContext
}

/**
 * Set a property on a mesh
 * @param params - Parameters object
 * @returns Index of the modified mesh, or -1 if not found
 */
export function setMeshProperty(params: SetMeshPropertyParams): number {
    const { meshes, id, key, val, gl } = params
    const idx = getMeshIndexByID(meshes, id)
    if (idx < 0) {
        log.warn('setMeshProperty() id not loaded', id)
        return -1
    }
    meshes[idx].setProperty(key, val, gl)
    return idx
}

/**
 * Parameters for indexNearestXYZmm
 */
export interface IndexNearestXYZmmParams {
    meshes: NVMesh[]
    meshId: number
    Xmm: number
    Ymm: number
    Zmm: number
}

/**
 * Find the nearest vertex to the given coordinates
 * @param params - Parameters object
 * @returns Array where [0] is vertex index and [1] is distance, or [NaN, NaN] if mesh not found
 */
export function indexNearestXYZmm(params: IndexNearestXYZmmParams): number[] {
    const { meshes, meshId, Xmm, Ymm, Zmm } = params
    const idx = getMeshIndexByID(meshes, meshId)
    if (idx < 0) {
        log.warn('indexNearestXYZmm() id not loaded', meshId)
        return [NaN, NaN]
    }
    return meshes[idx].indexNearestXYZmm(Xmm, Ymm, Zmm)
}

/**
 * Parameters for decimateHierarchicalMesh
 */
export interface DecimateHierarchicalMeshParams {
    meshes: NVMesh[]
    meshId: number
    gl: WebGL2RenderingContext
    order?: number
}

/**
 * Reduce complexity of a FreeSurfer hierarchical mesh
 * @param params - Parameters object
 * @returns boolean false if mesh not found, not hierarchical, or lower order; true on success
 */
export function decimateHierarchicalMesh(params: DecimateHierarchicalMeshParams): boolean {
    const { meshes, meshId, gl, order = 3 } = params
    const idx = getMeshIndexByID(meshes, meshId)
    if (idx < 0) {
        log.warn('decimateHierarchicalMesh() id not loaded', meshId)
        return false
    }
    return meshes[idx].decimateHierarchicalMesh(gl, order)
}

/**
 * Parameters for reverseFaces
 */
export interface ReverseFacesParams {
    meshes: NVMesh[]
    meshId: number
    gl: WebGL2RenderingContext
}

/**
 * Reverse triangle winding of mesh (swap front and back faces)
 * @param params - Parameters object
 * @returns true if successful, false if mesh not found
 */
export function reverseFaces(params: ReverseFacesParams): boolean {
    const { meshes, meshId, gl } = params
    const idx = getMeshIndexByID(meshes, meshId)
    if (idx < 0) {
        log.warn('reverseFaces() id not loaded', meshId)
        return false
    }
    meshes[idx].reverseFaces(gl)
    return true
}

/**
 * Parameters for setMeshLayerProperty
 */
export interface SetMeshLayerPropertyParams {
    meshes: NVMesh[]
    meshId: number | string
    layer: number
    key: keyof NVMeshLayer
    val: number
    gl: WebGL2RenderingContext
}

/**
 * Set a property on a mesh layer
 * @param params - Parameters object
 * @returns Promise that resolves to true if successful, false if mesh not found
 */
export async function setMeshLayerProperty(params: SetMeshLayerPropertyParams): Promise<boolean> {
    const { meshes, meshId, layer, key, val, gl } = params
    const idx = getMeshIndexByID(meshes, meshId)
    if (idx < 0) {
        log.warn('setMeshLayerProperty() id not loaded', meshId)
        return false
    }
    await meshes[idx].setLayerProperty(layer, key, val, gl)
    return true
}

/**
 * Parameters for setMeshShader
 */
export interface SetMeshShaderParams {
    meshes: NVMesh[]
    meshShaders: Array<{ Name: string }>
    id: number | string
    meshShaderNameOrNumber: number | string
    meshShaderNameToNumber: (name: string) => number | undefined
}

/**
 * Set the shader for a mesh
 * @param params - Parameters object
 * @returns Object with mesh index and shader index, or null if mesh not found
 */
export function setMeshShader(params: SetMeshShaderParams): { meshIndex: number; shaderIndex: number } | null {
    const { meshes, meshShaders, id, meshShaderNameOrNumber, meshShaderNameToNumber } = params

    let shaderIndex: number | undefined = 0
    if (typeof meshShaderNameOrNumber === 'number') {
        shaderIndex = meshShaderNameOrNumber
    } else {
        shaderIndex = meshShaderNameToNumber(meshShaderNameOrNumber)
    }

    if (shaderIndex === undefined) {
        throw new Error('shaderIndex undefined')
    }

    shaderIndex = Math.min(shaderIndex, meshShaders.length - 1)
    shaderIndex = Math.max(shaderIndex, 0)

    const meshIndex = getMeshIndexByID(meshes, id)
    if (meshIndex >= meshes.length || meshIndex < 0) {
        log.debug('Unable to change shader until mesh is loaded (maybe you need async)')
        return null
    }

    meshes[meshIndex].meshShaderIndex = shaderIndex
    return { meshIndex, shaderIndex }
}
