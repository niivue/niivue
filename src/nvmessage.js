export const UPDATE = "update";
export const CREATE = "create";
export const JOIN = "join";
export const ADD_VOLUME_URL = "add volume url";
export const REMOVE_VOLUME_URL = "remove volume media";
export const ADD_MESH_URL = "add mesh url";
export const REMOVE_MESH_URL = "remove mesh media";
export const SET_4D_VOL_INDEX = "set 4d vol index";
<<<<<<< HEAD
export const UPDATE_IMAGE_OPTIONS = "update image options";
=======
>>>>>>> Added timeseries control

/**
 * @class NVMessageUpdateData
 * @type NVMessageUpdateData
 * @constructor
 * @param {number} azimuth
 * @param {number} elevation
 * @param {number[]} clipPlane
 * @param {number} zoom
 */
export function NVMesssageUpdateData(azimuth, elevation, clipPlane, zoom) {
  return {
    azimuth,
    elevation,
    clipPlane,
    zoom,
  };
}

/**
 * @class NVMessageSet4DVolumeIndex
 * @type NVMessageSet4DVolumeIndex
 * @constructor
 * @param {string} url
 * @param {number} index
 */
export function NVMessageSet4DVolumeIndexData(url, index) {
  return {
    url,
    index,
  };
}

/**
 * @typedef { import('./nvimage').NVImageFromUrlOptions } NVImageFromUrlOptions
 */

/**
 * @typedef { import('./nvmesh').NVMeshFromUrlOptions } NVMeshFromUrlOptions
 */

/**
 * @class NVMessage
 * @type NVMessage
 * @description
 * NVMessage can be used to synchronize a session actions
 * @constructor
 * @param {string} messageType
<<<<<<< HEAD
 * @param {(string|NVMesssageUpdateData|NVImageFromUrlOptions|NVMeshFromUrlOptions|NVMessageSet4DVolumeIndex)} messageData
=======
 * @param {(string|NVMesssageUpdateData|NVImageFromUrlOptions|NVMessageSet4DVolumeIndex)} messageData
>>>>>>> Added timeseries control
 * @param {string} sessionKey
 */
export function NVMessage(messageType, messageData = "", sessionKey = "") {
  let message = {};
  message.key = sessionKey;
  message.op = messageType;

  switch (messageType) {
    case UPDATE:
      Object.assign(message, messageData);
      break;
    case UPDATE_IMAGE_OPTIONS:
    case ADD_VOLUME_URL:
      message.urlImageOptions = messageData;
      break;
    case ADD_MESH_URL:
      message.urlMeshOptions = messageData;
      break;
    case REMOVE_VOLUME_URL:
    case REMOVE_MESH_URL:
      message.url = messageData;
      break;
    case SET_4D_VOL_INDEX:
      message.url = messageData.url;
      message.index = messageData.index;
      break;
  }

  return message;
}
