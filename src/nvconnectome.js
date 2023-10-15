import { NVMesh } from "./nvmesh";
import { NVUtilities } from "./nvutilities";
import { NiivueObject3D } from "./niivue-object3D";
import { NVMeshUtilities } from "./nvmesh-utilities";
import { cmapper } from "./colortables";
import { NVLabel3D } from "./nvlabel";

/**
 * Representes the vertices of a connectome
 * @typedef {Object} NVConnectomeNode
 * @property {string} name - name of node
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} colorValue - color value of node (actual color determined by colormap)
 * @property {number} sizeValue - size value of node (actual size determined by node scale times this value in mms)
 * @property {NVLabel3D} label
 */

/**
 * Represents edges between connectome nodes
 * @typedef {Object} NVConnectomeEdge
 * @property {NVConnectomeNode[]} nodes - connected nodes
 * @property {number} colorValue - color value to determin color of edge based on color map
 */
export class NVConnectomeEdge {
  contructor(firstNode, secondNode, colorValue) {
    this.firstNode = firstNode;
    this.secondNode = secondNode;
    this.colorValue = colorValue;
  }
}

const defaultOptions = {
  name: "untitled connectome",
  nodeColormap: "warm",
  nodeColormapNegative: "winter",
  nodeMinColor: 0,
  nodeMaxColor: 4,
  nodeScale: 3,
  edgeColormap: "warm",
  edgeColormapNegative: "winter",
  edgeMin: 2,
  edgeMax: 6,
  edgeScale: 1,
};

/**
 * @typedef {Object} NVConnectomeOptions
 * @property {string} name
 * @property {string} nodeColormap
 * @property {string} nodeColormapNegative
 * @property {number} nodeMinColor
 * @property {number} nodeMaxColor
 * @property {number} nodeScale - scale factor for node, e.g. if 2 and a node has size 3, a 6mm ball is drawn
 * @property {string} edgeColormap
 * @property {string} edgeColormapNegative
 * @property {number} edgeMin
 * @property {number} edgeMax
 * @property {number} edgeScale
 * @property {number} legendLineThickness
 */
// export class NVConnectomeOptions extends NVMeshOptions {}
/**
 * Represents a connectome
 */
export class NVConnectome extends NVMesh {
  /**
   * @constructor
   * @param {NVConnectomeOptions} connectome
   */
  constructor(gl, connectome) {
    super([], [], connectome.name, [], 1.0, true, gl, connectome);
    this.gl = gl;
    // this.nodes = connectome.nodes;
    // this.edges = connectome.edges;
    // this.options = { ...defaultOptions, ...connectome };
    if (this.nodes) {
      this.updateLabels();
    }

    this.nodesChanged = new EventTarget();
  }

  static convertFreeSurferConnectome(json, colormap = "warm") {
    let isValid = true;
    if (!("data_type" in json)) isValid = false;
    else if (json.data_type !== "fs_pointset") isValid = false;
    if (!("points" in json)) isValid = false;
    if (!isValid) {
      throw Error("not a valid FreeSurfer json pointset");
    }

    const nodes = json.points.map((p) => ({
      name:
        Array.isArray(p.comments) &&
        p.comments.length > 0 &&
        "text" in p.comments[0]
          ? p.comments[0].text
          : "",
      x: p.coordinates.x,
      y: p.coordinates.y,
      z: p.coordinates.z,
      colorValue: 1,
      sizeValue: 1,
      metadata: p.comments,
    }));
    const connectome = {
      ...defaultOptions,
      nodeColormap: colormap,
      edgeColormap: colormap,
      nodes,
    };
    return connectome;
  }

  updateLabels() {
    const nodes = this.nodes;
    if (nodes.length > 0) {
      // largest node
      const largest = nodes.reduce((a, b) =>
        a.sizeValue > b.sizeValue ? a : b
      ).sizeValue;
      const min = this.nodeMinColor
        ? this.nodeMinColor
        : nodes.reduce((a, b) => (a.colorValue < b.colorValue ? a : b))
            .colorValue;
      const max = this.nodeMaxColor
        ? this.nodeMaxColor
        : nodes.reduce((a, b) => (a.colorValue > b.colorValue ? a : b))
            .colorValue;
      let lut = cmapper.colormap(this.nodeColormap, this.colormapInvert);
      let lutNeg = cmapper.colormap(
        this.nodeColormapNegative,
        this.colormapInvert
      );

      const hasNeg = "nodeColormapNegative" in this;
      const legendLineThickness = this.legendLineThickness
        ? this.legendLineThickness
        : 0.0;

      for (let i = 0; i < nodes.length; i++) {
        let color = nodes[i].colorValue;
        let isNeg = false;
        if (hasNeg && color < 0) {
          isNeg = true;
          color = -color;
        }

        if (min < max) {
          if (color < min) continue;
          color = (color - min) / (max - min);
        } else color = 1.0;

        color = Math.round(Math.max(Math.min(255, color * 255)), 1) * 4;
        let rgba = [lut[color], lut[color + 1], lut[color + 2], 255];
        if (isNeg) {
          rgba = [lutNeg[color], lutNeg[color + 1], lutNeg[color + 2], 255];
        }
        rgba = rgba.map((c) => c / 255);

        nodes[i].label = new NVLabel3D(
          nodes[i].name,
          {
            textColor: rgba,
            bulletScale: nodes[i].sizeValue / largest,
            bulletColor: rgba,
            lineWidth: legendLineThickness,
            lineColor: rgba,
            textScale: 1.0,
          },
          [nodes[i].x, nodes[i].y, nodes[i].z]
        );
      }
    }
  }

  addConnectomeNode(node) {
    this.nodes.push(node);
    this.updateLabels();
    this.nodesChanged.dispatchEvent(
      new CustomEvent("nodeAdded", { detail: { node } })
    );
  }

  deleteConnectomeNode(node) {
    this.nodes = this.nodes.filter((n) => n != node);
    this.edges = this.edges.filter(
      (e) => e.firstNode != node && e.secondNode != node
    );
    this.updateLabels();
    this.nodesChanged.dispatchEvent(
      new CustomEvent("nodeDeleted", { detail: { node } })
    );
  }

  updateConnectomeNodeByIndex(index, updatedNode) {
    this.nodes[index] = updatedNode;
    this.updateLabels();
    this.updateConnectome(this.gl);
    this.nodesChanged.dispatchEvent(
      new CustomEvent("nodeChanged", { detail: { node: updatedNode } })
    );
  }

  updateConnectomeNodeByPoint(point, updatedNode) {
    if (!this.connectome.nodes) {
      throw new Error("Node to update does not exist");
    }
    const node = this.connectome.nodes.find((node) =>
      NVUtilities.arraysAreEqual([node.x, node.y, node.z], point)
    );
    if (!node) {
      throw new Error(`Node with point ${point} to update does not exist`);
    }
    const index = this.connectome.nodes.findIndex((n) => n === node);
    this.updateConnectomeNodeByIndex(index, updatedNode);
  }

  /**
   *
   * @param {number[]} point
   * @param {number} distance
   * @returns {NVConnectomeNode[]}
   */
  findCloseNodes(point, distance) {
    return this.nodes.filter(
      (n) =>
        distance <=
        Math.sqrt(
          Math.pow(n.x - point[0], 2) +
            Math.pow(n.y - point[1], 2) +
            Math.pow(n.z - point[2], 2)
        )
    );
  }

  updateConnectome(gl) {
    let tris = [];
    let pts = [];
    let rgba255 = [];
    let lut = cmapper.colormap(this.nodeColormap, this.colormapInvert);
    let lutNeg = cmapper.colormap(
      this.nodeColormapNegative,
      this.colormapInvert
    );
    let hasEdges = false;
    let hasNeg = "nodeColormapNegative" in this;
    let min = this.nodeMinColor;
    let max = this.nodeMaxColor;
    const nNode = this.nodes.length;
    for (let i = 0; i < nNode; i++) {
      let radius = this.nodes[i].sizeValue * this.nodeScale;
      if (radius <= 0.0) continue;
      let color = this.nodes[i].colorValue;
      let isNeg = false;
      if (hasNeg && color < 0) {
        isNeg = true;
        color = -color;
      }
      if (min < max) {
        if (color < min) continue;
        color = (color - min) / (max - min);
      } else color = 1.0;
      color = Math.round(Math.max(Math.min(255, color * 255)), 1) * 4;
      let rgba = [lut[color], lut[color + 1], lut[color + 2], 255];
      if (isNeg)
        rgba = [lutNeg[color], lutNeg[color + 1], lutNeg[color + 2], 255];
      let pt = [this.nodes[i].x, this.nodes[i].y, this.nodes[i].z];

      NiivueObject3D.makeColoredSphere(pts, tris, rgba255, radius, pt, rgba);
    }

    if (nNode > 1 && "edges" in this) {
      let nEdges = this.edges.length;
      if ((nEdges = nNode * nNode)) hasEdges = true;
      else console.log("Expected %d edges not %d", nNode * nNode, nEdges);
    }
    //draw all edges
    if (hasEdges) {
      lut = cmapper.colormap(this.edgeColormap, this.colormapInvert);
      lutNeg = cmapper.colormap(this.edgeColormapNegative, this.colormapInvert);
      hasNeg = "edgeColormapNegative" in this;
      min = this.edgeMin;
      max = this.edgeMax;
      for (let i = 0; i < nNode - 1; i++) {
        for (let j = i + 1; j < nNode; j++) {
          let color = this.edges[i * nNode + j];
          let isNeg = false;
          if (hasNeg && color < 0) {
            isNeg = true;
            color = -color;
          }
          let radius = color * this.edgeScale;
          if (radius <= 0) continue;
          if (min < max) {
            if (color < min) continue;
            color = (color - min) / (max - min);
          } else color = 1.0;
          color = Math.round(Math.max(Math.min(255, color * 255)), 1) * 4;
          let rgba = [lut[color], lut[color + 1], lut[color + 2], 255];
          if (isNeg)
            rgba = [lutNeg[color], lutNeg[color + 1], lutNeg[color + 2], 255];
          let pti = [this.nodes[i].x, this.nodes[i].y, this.nodes[i].z];
          let ptj = [this.nodes[j].x, this.nodes[j].y, this.nodes[j].z];
          NiivueObject3D.makeColoredCylinder(
            pts,
            tris,
            rgba255,
            pti,
            ptj,
            radius,
            rgba
          );
        } //for j
      } //for i
    } //hasEdges
    //calculate spatial extent of connectome: user adjusting node sizes may influence size
    let obj = NVMeshUtilities.getExtents(pts);

    this.furthestVertexFromOrigin = obj.mxDx;
    this.extentsMin = obj.extentsMin;
    this.extentsMax = obj.extentsMax;
    let posNormClr = this.generatePosNormClr(pts, tris, rgba255);
    //generate webGL buffers and vao
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Int32Array(tris),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(posNormClr),
      gl.STATIC_DRAW
    );
    this.indexCount = tris.length;
  }

  updateMesh(gl) {
    this.updateConnectome(gl);
  }

  json() {}

  /**
   * Factory method to create connectome from options
   * @static
   * @param {WebGL2RenderingContext} gl
   * @param {string} url
   * @returns {NVConnectome}
   */
  static async loadConnectomeFromUrl(gl, url) {
    const response = await fetch(url);
    const json = await response.json();
    return new NVConnectome(gl, json);
  }
}
