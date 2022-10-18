import { v4 as uuidv4 } from "uuid";
import { webSocket } from "rxjs/webSocket";

/**
 * @class SessionUser
 * @type SessionUser
 * @description SessionUser specifies display name, user id and user key
 * @param {string} displayName
 * @param {string} userId
 * @param {string} userKey Used to protect user properties
 * @param {Map} userProperties
 */
export function SessionUser(
  displayName = undefined,
  userId = undefined,
  userKey = undefined,
  userProperties = undefined
) {
  this.userId = userId || uuidv4();
  this.displayName = displayName || `user-${this.userId}`;
  this.userKey = userKey || uuidv4();
  this.userProperties = userProperties || new Map();
}

/**
 * Checks if local storage is available
 * @param {string} type type of local storage requested
 * @returns {boolean}
 */
function storageAvailable(type) {
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    );
  }
}

/**
 * @class SessionBus
 * @type SessionBus
 * @description SessionBus is for synchonizing both remote and local instances
 * @constructor
 * @param {string} name
 * @param {SessionUser} user
 * @param {function} onMessageCallback  call back for new messages
 * @param {string} serverURL
 */
export function SessionBus(
  name,
  user,
  onMessageCallback,
  serverURL = "",
  sessionKey = ""
) {
  if (!storageAvailable("localStorage")) {
    throw "Local storage unavailable";
  }

  let sessionUser = user || new SessionUser("anonymous");

  this.onMessageCallBack = onMessageCallback;

  this.userId = sessionUser.userId;
  this.userKey = sessionUser.userKey;
  this.displayName = sessionUser.displayName;

  this.isConnectedToServer = false;
  this.isController = false;

  this.sessionScene = {};
  this.sessionKey = sessionKey ? sessionKey : uuidv4();

  this.sessionName = name;
  this.sessionSceneName = `session-${name}-scene`;

  this.user = {
    id: this.userId,
    displayName: this.displayName,
    crosshairPos: [0.0, 0.0, 0.0],
    userKey: this.userKey,
  };

  // local
  this.userQueueName = `user-${this.userId}-q`;
  this.userListName = `${name}-user-list`;

  // remote
  this.serverConnection$ = null;

  if (serverURL) {
    this.connectToServer(serverURL, name);
    this.subscribeToServer();
    this.isConnectedToServer = true;
    this.serverConnection$.next({
      op: SessionBus.MESSAGE.CREATE,
      key: this.sessionKey,
    });
  } else {
    // create our message queue
    localStorage.setItem(this.userQueueName, JSON.stringify([]));
  }

  window.addEventListener("storage", this.localStorageEventListener.bind(this));
}

SessionBus.prototype.sendSessionMessage = function (message) {
  if (this.isConnectedToServer) {
    this.serverConnection$.next({
      ...message,
      key: this.sessionKey,
      userKey: this.userKey,
    });
  } else {
    this.sendLocalMessage(message);
  }
};

// Remote
// not included in public docs
// Internal function to connect to web socket server
SessionBus.prototype.connectToServer = function (serverURL, sessionName) {
  const url = new URL(serverURL);
  url.pathname = "websockets";
  url.search = "?session=" + sessionName;
  this.serverConnection$ = webSocket(url.href);
  console.log(url.href);
};

// Internal function called after a connection with the server has been made
SessionBus.prototype.subscribeToServer = function () {
  this.serverConnection$.subscribe({
    next: (msg) => {
      this.onMessageCallBack(msg);
    }, // Called whenever there is a message from the server.
    error: (err) => console.log(err), // Called if at any point WebSocket API signals some kind of error.
    complete: () => console.log("complete"), // Called when connection is closed (for whatever reason).
  });
};
