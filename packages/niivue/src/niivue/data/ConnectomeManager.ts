/**
 * Connectome management functions for handling connectome loading and label operations.
 * This module provides pure functions for connectome data handling.
 */

import type { NVMesh } from '@/nvmesh'
import { MeshType } from '@/nvmesh'
import { NVConnectome, FreeSurferConnectome } from '@/nvconnectome'
import type { Connectome, LegacyConnectome, NVConnectomeNode } from '@/types'
import { NVLabel3D, NVLabel3DStyle, LabelAnchorPoint, LabelLineTerminator } from '@/nvlabel'
import { log } from '@/logger'

/**
 * Parameters for loading a connectome as a mesh
 */
export interface LoadConnectomeAsMeshParams {
  gl: WebGL2RenderingContext
  json: Connectome | LegacyConnectome | FreeSurferConnectome
}

/**
 * Converts various connectome JSON formats to a standardized mesh representation.
 *
 * @param params - Parameters object containing gl context and JSON data
 * @returns The connectome as an NVMesh
 * @throws Error if the JSON is not a known connectome format
 */
export function loadConnectomeAsMesh(params: LoadConnectomeAsMeshParams): NVMesh {
  const { gl, json } = params
  let connectome = json

  if ('data_type' in json && json.data_type === 'fs_pointset') {
    connectome = NVConnectome.convertFreeSurferConnectome(json as FreeSurferConnectome)
    log.warn('converted FreeSurfer connectome', connectome)
  } else if ('nodes' in json) {
    const nodes = json.nodes
    if ('names' in nodes && 'X' in nodes && 'Y' in nodes && 'Z' in nodes && 'Color' in nodes && 'Size' in nodes) {
      // convert dense "legacy" format to sparse format
      connectome = NVConnectome.convertLegacyConnectome(json as LegacyConnectome)
    }
  } else {
    throw new Error('not a known connectome format')
  }

  return new NVConnectome(gl, connectome as LegacyConnectome)
}

/**
 * Label data created from a connectome node
 */
export interface NodeAddedLabelData {
  text: string
  style: NVLabel3DStyle
  position: [number, number, number]
}

/**
 * Creates label data from a connectome node event.
 * The actual label addition should be done by the caller (Niivue).
 *
 * @param node - The connectome node that was added
 * @param lineTerminator - The line terminator enum value
 * @returns Label data for the node
 */
export function createNodeAddedLabelData(
  node: NVConnectomeNode,
  lineTerminator: LabelLineTerminator = LabelLineTerminator.NONE
): NodeAddedLabelData {
  const rgba = [1, 1, 1, 1]
  return {
    text: node.name,
    style: {
      textColor: rgba,
      bulletScale: 1,
      bulletColor: rgba,
      lineWidth: 0,
      lineColor: rgba,
      lineTerminator,
      textScale: 1.0
    },
    position: [node.x, node.y, node.z]
  }
}

/**
 * Parameters for getting all labels
 */
export interface GetAllLabelsParams {
  meshes: NVMesh[]
  documentLabels: NVLabel3D[]
}

/**
 * Get all 3D labels from document and connectome meshes.
 *
 * @param params - Parameters object containing meshes and document labels
 * @returns Array of all labels
 */
export function getAllLabels(params: GetAllLabelsParams): NVLabel3D[] {
  const { meshes, documentLabels } = params

  const connectomes = meshes.filter((m) => m.type === MeshType.CONNECTOME)
  const meshNodes = connectomes.flatMap((m) => m.nodes as NVConnectomeNode[])
  const meshLabels = meshNodes.map((n) => n.label)

  // filter out undefined labels
  const definedMeshLabels = meshLabels.filter((l): l is NVLabel3D => l !== undefined)
  const labels = [...documentLabels, ...definedMeshLabels]

  return labels
}

/**
 * Parameters for getting connectome labels
 */
export interface GetConnectomeLabelsParams {
  meshes: NVMesh[]
  documentLabels: NVLabel3D[]
}

/**
 * Get all visible connectome and non-anchored mesh labels.
 *
 * @param params - Parameters object containing meshes and document labels
 * @returns Array of visible connectome labels
 */
export function getConnectomeLabels(params: GetConnectomeLabelsParams): NVLabel3D[] {
  const { meshes, documentLabels } = params

  const connectomes = meshes.filter((m) => m.type === MeshType.CONNECTOME && m.showLegend !== false)
  const meshNodes = connectomes.flatMap((m) => m.nodes as NVConnectomeNode[])
  const meshLabels = meshNodes.map((n) => n.label)

  // filter out undefined labels and labels with empty text
  const definedMeshLabels = meshLabels.filter((l): l is NVLabel3D => l !== undefined && l.text !== '')

  // get all of our non-anchored labels
  const nonAnchoredLabels = documentLabels.filter((l) => l.anchor == null || l.anchor === LabelAnchorPoint.NONE)

  // get the unique set of unanchored labels
  const nonAnchoredLabelSet = new Set(definedMeshLabels)
  for (const label of nonAnchoredLabels) {
    nonAnchoredLabelSet.add(label)
  }

  // now add mesh atlases
  const regularMeshes = meshes.filter((m) => m.type === MeshType.MESH)
  for (let i = 0; i < regularMeshes.length; i++) {
    for (let j = 0; j < regularMeshes[i].layers.length; j++) {
      if (regularMeshes[i].layers[j].labels) {
        for (let k = 0; k < regularMeshes[i].layers[j].labels.length; k++) {
          nonAnchoredLabelSet.add(regularMeshes[i].layers[j].labels[k])
        }
      }
    }
  }

  return Array.from(nonAnchoredLabelSet)
}

/**
 * Convert a FreeSurfer connectome format to the standard connectome format.
 * This is a convenience wrapper around NVConnectome.convertFreeSurferConnectome.
 *
 * @param json - FreeSurfer connectome JSON data
 * @returns Standard connectome format
 */
export function convertFreeSurferConnectome(json: FreeSurferConnectome): Connectome {
  return NVConnectome.convertFreeSurferConnectome(json)
}

/**
 * Convert a legacy connectome format to the standard connectome format.
 * This is a convenience wrapper around NVConnectome.convertLegacyConnectome.
 *
 * @param json - Legacy connectome JSON data
 * @returns Standard connectome format
 */
export function convertLegacyConnectome(json: LegacyConnectome): Connectome {
  return NVConnectome.convertLegacyConnectome(json)
}
