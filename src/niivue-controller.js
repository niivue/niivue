import { SessionBus, SessionUser } from "./session-bus";

/**
 * @class SessionBus
 * @type SessionBus
 * @description SessionBus is for synchonizing both remote and local instances
 * @constructor
 * @param {import("./niivue").Niivue} niivue  Niivue object to conttrol
 */
export function NiivueController(niivue) {
  this.niivue = niivue;

  // bind all of our events
}

NiivueController.prototype.onNewMessage = function (msg) {
  console.log(msg);
};

/**
 *
 * @param {string} serverBaseUrl
 * @param {string} sessionName
 * @param {string} sessionKey
 * @param {SessionUser} user
 */
NiivueController.prototype.connectToSession = function (
  serverBaseUrl,
  sessionName,
  sessionKey = undefined,
  user = undefined
) {
  const url = new URL(serverBaseUrl);
  url.pathname = "websockets";
  url.search = "?session=" + sessionName;

  this.user = user || new SessionUser();

  this.sessionBus = new SessionBus(
    sessionName,
    this.user,
    this.onNewMessage.bind(this),
    serverBaseUrl,
    sessionKey
  );
};
