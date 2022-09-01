import { v4 as uuidv4 } from "uuid";
import { webSocket } from "rxjs/webSocket";

const MAX_ALLOWED_LOCK_TIME = 3000;

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
 * Get a random color to assign user
 * @returns {number[]} RGB color
 */
function getRandomColor() {
  let color;
  switch (Math.floor(Math.random() * 4)) {
    case 0:
      color = [1, 0, 0];
      break;
    case 1:
      color = [0, 1, 0];
      break;
    case 2:
      color = [0, 0, 1];
      break;
    default:
      color = [Math.random(), Math.random(), Math.random()];
  }

  return [...color, 1];
}

/**
 * @class SessionBus
 * @type SessionBus
 * @description SessionBus is for synchonizing both remote and local instances
 * @constructor
 * @param {function} onMessageCallback  call back for new messages
 */
export function SessionBus(
  sessionName,
  onMessageCallback,
  serverURL = "",
  sessionKey = "",
  displayName = ""
) {
  if (!storageAvailable("localStorage")) {
    throw "Local storage unavailable";
  }

  this.onMessageCallBack = onMessageCallback;
  this.userId = uuidv4();
  this.userKey = uuidv4();
  this.isConnectedToServer = false;
  this.isController = false;
  this.sessionScene = {};
  this.sessionKey = sessionKey ? sessionKey : uuidv4();
  this.displayName = displayName ? displayName : `user-${this.userId}`;
  this.sessionName = sessionName;
  this.sessionSceneName = `session-${sessionName}-scene`;

  this.user = {
    id: this.userId,
    displayName: this.displayName,
    crosshairPos: [0.0, 0.0, 0.0],
    userKey: this.userKey,
  };

  // local
  this.userQueueName = `user-${this.userId}-q`;
  this.userListName = `${sessionName}-user-list`;

  // remote
  this.serverConnection$ = null;

  if (serverURL) {
    this.connectToServer(serverURL, sessionName);
    this.isConnectedToServer = true;

    // TODO(cdrake): add code to send create message to server
  } else {
    // create our message queue
    localStorage.setItem(this.userQueueName, JSON.stringify([]));
    this.lockAndGetItem(this.userListName).then((userList) => {
      this.userList = userList;
      if (this.userList) {
        this.userList.push(this.user);
      } else {
        this.userList = [this.user];
      }
      localStorage.setItem(this.userListName, JSON.stringify(this.userList));
      this.unlockItem(this.userListName);

      // check if this session exists

      let sessionScene = JSON.parse(
        localStorage.getItem(this.sessionSceneName)
      );
      if (sessionScene) {
        this.sessionScene = sessionScene;
        this.isController = this.sessionKey === sessionScene.key;

        onMessageCallback({
          op: SessionBus.MESSAGE.SESSION_JOINED,
          isController: this.isController,
          url: "",
          userList: this.userList,
          userKey: this.userKey,
          userId: this.userId,
          userName: this.displayName,
          message: "OK",
        });
      } else {
        this.sessionScene = {
          elevation: 0,
          azimuth: 0,
          zoom: 1.0,
          cliplane: [0, 0, 0, 0],
          key: this.sessionKey,
        };
        // create scene
        this.lockSetAndUnlockItem(this.sessionSceneName, this.sessionScene);
        this.isController = true;
        this.unlockItem(this.sessionSceneName);

        onMessageCallback({
          op: SessionBus.MESSAGE.SESSION_CREATED,
          key: this.sessionKey,
          userId: this.userId,
          userName: this.displayName,
          userKey: this.userKey,
          url: "",
          isError: false,
          message: "OK",
        });
      }
    });
  }

  window.addEventListener("storage", this.localStorageEventListener.bind(this));
}

SessionBus.MESSAGE = Object.freeze({
  UPDATE: "update",
  CREATE: "create",
  JOIN: "join",
  ADD_VOLUME_URL: "add volume url",
  REMOVE_VOLUME_URL: "remove volume media",
  ADD_MESH_URL: "add mesh url",
  REMOVE_MESH_URL: "remove mesh media",
  SET_4D_VOL_INDEX: "set 4d vol index",
  UPDATE_IMAGE_OPTIONS: "update image options",
  UPDATE_CROSSHAIR_POS: "update crosshair pos",
  CROSSHAIR_POS_UPDATED: "crosshair pos updated",
  USER_JOINED: "user joined",
  UPDATE_SCENE_STATE: "update scene state",
  UPDATE_USER_STATE: "update user state",
  USER_STATE_UPDATED: "user state updated",
  SCENE_STATE_UPDATED: "scene state updated",
  ACK: "ack",
  SESSION_CREATED: "session created",
  SESSION_JOINED: "session joined",
});

SessionBus.prototype.sendSessionMessage = function (message) {
  //TODO(cdrake): add remote send message
  this.sendLocalMessage(message);
};

// Local
SessionBus.prototype.lockItem = function (itemName) {
  let mutexName = `${itemName}-mutex`;
  let mutexString = localStorage.getItem(mutexName);
  let mutex = JSON.parse(mutexString);

  let lockObtained = false;
  if (!Array.isArray(mutex)) {
    mutex = {
      locked: true,
      lockTime: Date.now(),
    };
    lockObtained = true;
    localStorage.setItem(mutexName, JSON.stringify(mutex));
  } else {
    let now = new Date();
    const elapsed = now - mutex.lockTime;
    // check if lock is not orphaned
    if (!mutex.locked || elapsed > MAX_ALLOWED_LOCK_TIME) {
      mutex.lockTime = now;
      localStorage.setItem(mutexName, JSON.stringify(mutex));
      lockObtained = true;
    }
  }
  return lockObtained;
};

SessionBus.prototype.unlockItem = function (itemName) {
  let mutexName = `${itemName}-mutex`;
  let mutex = JSON.parse(localStorage.getItem(mutexName));
  if (!mutex) {
    throw `${itemName} mutex does not exist`;
  }

  mutex.locked = false;
  localStorage.setItem(mutexName, JSON.stringify(mutex));
};

SessionBus.prototype.lockSetAndUnlockItem = async function (itemName, value) {
  let lockObtained = this.lockItem(itemName);
  while (!lockObtained) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    lockObtained = this.lockItem(itemName);
  }

  localStorage.setItem(itemName, JSON.stringify(value));
  this.unlockItem(itemName);
};

SessionBus.prototype.lockAndGetItem = async function (itemName) {
  let lockObtained = this.lockItem(itemName);
  while (!lockObtained) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    lockObtained = this.lockItem(itemName);
  }
  let itemString = localStorage.getItem(itemName);
  return itemString ? JSON.parse(itemString) : null;
};

/**
 *
 * @param {*} message
 * @returns {string} user key of created user
 */
SessionBus.prototype.assignUser = function (message) {
  let displayName;
  let id = message.id ? message.id : uuidv4();
  if (message.displayName) {
    displayName = message.displayName;
  } else {
    displayName = `user-${id}`;
  }
  let userKey = uuidv4();
  let color = message.color ? message.color : getRandomColor();
  let crosshairPos = [0.5, 0.5, 0.5];
  this.userMap.set(userKey, { id, displayName, color, crosshairPos });
  return userKey;
};

SessionBus.prototype.sendOtherClientsMessage = function (message) {
  // add the message for each client
  for (const user of this.userList) {
    if (user.id === this.userId) {
      continue;
    }
    console.log("sending message to " + user.id);
    let userQueueName = `user-${user.id}-q`;
    this.lockAndGetItem(userQueueName).then((messageQ) => {
      messageQ.push(message);
      localStorage.setItem(userQueueName, JSON.stringify(messageQ));
      this.unlockItem(userQueueName);
    });
  }
};

SessionBus.prototype.sendLocalMessage = function (message) {
  let scene = JSON.parse(localStorage.getItem(this.sessionSceneName));
  let res = {
    message: "OK",
    op: SessionBus.MESSAGE.ACK,
  };

  // create a unique id, update map of connected users
  switch (message.op) {
    case SessionBus.MESSAGE.UPDATE_SCENE_STATE:
      if (scene.key === this.sessionKey) {
        delete message.op;
        this.lockSetAndUnlockItem(this.sessionSceneName, {
          ...message,
          key: scene.key,
        });
      } else {
        console.log(
          "keys " + scene.key + " and " + this.sessionKey + " don't match"
        );
      }
      break;

    case SessionBus.MESSAGE.UPDATE_IMAGE_OPTIONS:
    case SessionBus.MESSAGE.ADD_VOLUME_URL:
      if (scene.key === this.sessionKey) {
        let msg = {
          op: message.op,
          urlImageOptions: message.urlImageOptions,
        };
        this.sendOtherClientsMessage(msg);
      } else {
        console.log(
          "keys " + scene.key + " and " + this.sessionKey + " don't match"
        );
      }
      break;
    case SessionBus.MESSAGE.REMOVE_VOLUME_URL:
      if (scene.key === this.sessionKey) {
        this.sendOtherClientsMessage({
          op: REMOVE_VOLUME_URL,
          url: message.url,
        });
      } else {
        console.log(
          "keys " + scene.key + " and " + this.sessionKey + " don't match"
        );
      }
      break;
    case SessionBus.MESSAGE.SET_4D_VOL_INDEX:
      if (scene.key === this.sessionKey) {
        this.sendOtherClientsMessage({
          op: message.op,
          url: message.url,
          index: message.index,
        });
      }
      break;
    case SessionBus.MESSAGE.ADD_MESH_URL:
      if (scene.key === this.sessionKey) {
        let msg = {
          op: message.op,
          urlMeshOptions: message.urlMeshOptions,
        };
        this.sendOtherClientsMessage(msg);
      }
      break;
    case SessionBus.MESSAGE.REMOVE_MESH_URL:
      if (scene.key === this.sessionKey) {
        this.sendOtherClientsMessage({
          op: REMOVE_MESH_URL,
          url: message.url,
        });
      }
      break;
    case SessionBus.MESSAGE.UPDATE_USER_STATE:
      if (userMap.has(this.userKey)) {
        let user = userMap.get(this.userKey);
        if (message.id == user.id) {
          user.color = message.color;
          user.displayName = message.displayName;

          userMap.set(this.userKey, user);
        }
      }
      break;

    case SessionBus.MESSAGE.UPDATE_CROSSHAIR_POS:
      if (userMap.has(this.userKey)) {
        let user = userMap.get(this.userKey);
        if (message.id == user.id) {
          console.log("updating crosshairs for " + this.displayName);
          console.log(message.crosshairPos);

          user.crosshairPos = message.crosshairPos;
          userMap.set(this.userKey, user);
          let msg = {
            op: CROSSHAIR_POS_UPDATED,
            id: user.id,
            isController: sessionOwnersMap.get(session).includes(user.id),
            crosshairPos: message.crosshairPos,
          };

          this.sendOtherClientsMessage(msg);
        }
      }
      break;

    default:
      res["op"] = SessionBus.MESSAGE.SCENE_STATE_UPDATED;
      res["azimuth"] = scene.azimuth;
      res["elevation"] = scene.elevation;
      res["zoom"] = scene.zoom;
      res["clipPlane"] = scene.clipPlane;

      break;
  }
  return res;
};

SessionBus.prototype.localStorageEventListener = function (e) {
  // is this message for us?
  switch (e.key) {
    case this.userListName:
      this.userList = JSON.parse(e.newValue);
      // compare new and old values
      let newUsers = JSON.parse(e.newValue).filter(
        (u) =>
          !JSON.parse(e.oldValue)
            .map((o) => o.id)
            .includes(u.id)
      );
      for (const newUser of newUsers) {
        this.onMessageCallBack({
          op: SessionBus.MESSAGE.USER_JOINED,
          user: newUser,
        });
      }
      break;
    case this.userQueueName:
      let messages = JSON.parse(e.newValue);
      for (const message of messages) {
        if (this.onMessageCallBack) {
          this.onMessageCallBack(message);
        }
      }

      this.lockSetAndUnlockItem(this.userQueueName, []);
      break;
    case this.sessionSceneName:
      let scene = JSON.parse(e.newValue);
      this.onMessageCallBack({
        op: SessionBus.MESSAGE.SCENE_STATE_UPDATED,
        ...scene,
      });
      break;
  }
};

// call our callback

// lock up after you're done
// remove the message if all users acknowledged the message

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
