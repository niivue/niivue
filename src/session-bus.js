import { webSocket } from 'rxjs/webSocket'

/**
 * @class SessionUser
 * @type SessionUser
 * @description SessionUser specifies display name, user id and user key
 * @param {string} displayName
 * @param {string} userId
 * @param {string} userKey Used to protect user properties
 * @param {Map} userProperties
 */
export class SessionUser {
  constructor(displayName = undefined, userId = undefined, userKey = undefined, userProperties = undefined) {
    this.id = userId || crypto.randomUUID()
    this.displayName = displayName || `user-${this.id}`
    this.key = userKey || crypto.randomUUID()
    this.properties = userProperties || new Map()
  }
}

/**
 * Checks if local storage is available
 * @param {string} type type of local storage requested
 * @returns {boolean}
 */
function storageAvailable(type) {
  let storage
  try {
    storage = window[type]
    const x = '__storage_test__'
    storage.setItem(x, x)
    storage.removeItem(x)
    return true
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === 'QuotaExceededError' ||
        // Firefox
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    )
  }
}

/**
 * @class SessionBus
 * @type SessionBus
 * @description SessionBus is for synchronizing both remote and local instances
 * @constructor
 * @param {string} name
 * @param {SessionUser} user
 * @param {function} onMessageCallback  call back for new messages
 * @param {string} serverURL
 */
export class SessionBus {
  constructor(name, user, onMessageCallback, serverURL = '', sessionKey = '') {
    this.userList = []
    this.user = user || new SessionUser('anonymous')

    this.onMessageCallBack = onMessageCallback

    this.isConnectedToServer = false
    this.isController = false

    this.sessionScene = {}
    this.sessionKey = sessionKey || crypto.randomUUID()

    this.sessionName = name
    this.sessionSceneName = `session-${name}-scene`

    if (serverURL) {
      // remote
      this.serverConnection$ = null
      this.connectToServer(serverURL, name)
      this.subscribeToServer()
      this.isConnectedToServer = true
      this.serverConnection$.next({
        op: SessionBus.MESSAGE.CREATE,
        key: this.sessionKey
      })
    } else {
      // local
      if (!storageAvailable('localStorage')) {
        throw new Error('Local storage unavailable')
      }

      this.userQueueName = `user-${this.user.id}-q`
      this.userListName = `${name}-user-list`

      // add our user to the list
      this.userList = JSON.parse(localStorage.getItem(this.userListName) || '[]')
      this.userList.push(this.user)
      localStorage.setItem(this.userListName, JSON.stringify(this.userList))

      // create our message queue
      localStorage.setItem(this.userQueueName, JSON.stringify([]))

      window.addEventListener('storage', this.localStorageEventListener.bind(this))
    }
  }

  sendSessionMessage(message) {
    message.from = this.userId
    if (this.isConnectedToServer) {
      this.serverConnection$.next({
        ...message,
        key: this.sessionKey,
        userKey: this.userKey
      })
    } else {
      this.sendLocalMessage(message)
    }
  }

  // Remote
  // not included in public docs
  // Internal function to connect to web socket server
  connectToServer(serverURL, sessionName) {
    const url = new URL(serverURL)
    url.pathname = 'websockets'
    url.search = '?session=' + sessionName
    this.serverConnection$ = webSocket(url.href)
    console.log(url.href)
  }

  // Internal function called after a connection with the server has been made
  subscribeToServer() {
    this.serverConnection$.subscribe({
      next: (msg) => {
        this.onMessageCallBack(msg)
      }, // Called whenever there is a message from the server.
      error: (err) => console.log(err), // Called if at any point WebSocket API signals some kind of error.
      complete: () => console.log('complete') // Called when connection is closed (for whatever reason).
    })
  }

  sendLocalMessage(message) {
    // add the message for each client
    for (const user of this.userList) {
      if (user.id === this.userId) {
        continue
      }
      const userQueueName = `user-${user.id}-q`
      const userQueueText = localStorage.getItem(userQueueName)
      const userQueue = userQueueText ? JSON.parse(userQueueText) : []
      userQueue.push(message)
      localStorage.setItem(userQueueName, JSON.stringify(userQueue))
    }
  }

  localStorageEventListener(e) {
    // is this message for us?
    switch (e.key) {
      case this.userListName:
        {
          this.userList = JSON.parse(e.newValue)
          // compare new and old values
          const newUsers = JSON.parse(e.newValue).filter(
            (u) =>
              !JSON.parse(e.oldValue)
                .map((o) => o.id)
                .includes(u.id)
          )
          for (const newUser of newUsers) {
            this.onMessageCallBack({
              op: 'user joined',
              user: newUser
            })
          }
        }
        break
      case this.userQueueName:
        {
          const messages = JSON.parse(e.newValue)
          for (const message of messages) {
            if (this.onMessageCallBack) {
              this.onMessageCallBack(message)
            }
          }
          // reset our message queue
          localStorage.setItem(this.userQueueName, [])
        }
        break
    }
  }
}
