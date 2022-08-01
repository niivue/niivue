export const UPDATE = "update";
export const CREATE = "create";
export const JOIN = "join";
export const ADD_VOLUME_URL = "add volume url";
export const REMOVE_VOLUME_URL = "remove volume media";
export const ADD_MESH_URL = "add mesh url";
export const REMOVE_MESH_URL = "remove mesh media";

/**
 * @class NVMessageUpdateData
 * @type NVMessageUpdateData
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
 * @typedef { import('./nvimage').NVImageFromUrlOptions } NVImageFromUrlOptions
 */

/**
 * @class NVMessage
 * @type NVMessage
 * @description
 * NVMessage can be used to synchronize a session actions
 * @constructor
 * @param {string} messageType
 * @param {(string|NVMesssageUpdateData|NVImageFromUrlOptions)} messageData
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
    case ADD_VOLUME_URL:
      message.urlImageOptions = messageData;
      break;
    case REMOVE_VOLUME_URL:
      message.url = messageData;
      break;
  }

  return message;
}
