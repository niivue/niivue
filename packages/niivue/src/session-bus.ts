import { WebSocketSubject, webSocket } from 'rxjs/webSocket'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { Message, NVMESSAGE } from './nvmessage.js'
import { log } from './logger.js'

/**
 * SessionUser specifies display name, user id and user key
 * @param userKey - Used to protect user properties
 */
export class SessionUser {
  id: string
  displayName: string
  key: string
  properties: Map<string, string>
  constructor(displayName?: string, userId?: string, userKey?: string, userProperties?: Map<string, string>) {
    this.id = userId || uuidv4()
    this.displayName = displayName || `user-${this.id}`
    this.key = userKey || uuidv4()
    this.properties = userProperties || new Map()
  }
}

/**
 * Checks if local storage is available
 * @param type - type of local storage requested
 * @returns whether or not the specified storage type is available
 */
function storageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  const storage = window[type]
  const test = 'test'
  try {
    storage.setItem(test, test)
    storage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

/**
 * SessionBus is for synchronizing both remote and local instances
 */
export class SessionBus {
  userList: SessionUser[]
  user: SessionUser
  userQueueName?: string
  userListName?: string

  onMessageCallback: (newMessage: Message) => void
  isConnectedToServer = false
  isController = false
  sessionScene = {}
  sessionKey: string
  sessionName: string
  sessionSceneName: string
  serverConnection$: WebSocketSubject<Message> | null = null

  constructor(
    name: string,
    user: SessionUser,
    onMessageCallback: (newMessage: Message) => void,
    serverURL = '',
    sessionKey = ''
  ) {
    this.userList = []
    this.user = user || new SessionUser('anonymous')

    this.onMessageCallback = onMessageCallback

    this.sessionScene = {}
    this.sessionKey = sessionKey || uuidv4()

    this.sessionName = name
    this.sessionSceneName = `session-${name}-scene`

    if (serverURL) {
      // remote
      this.connectToServer(serverURL, name)
      this.subscribeToServer()
      this.isConnectedToServer = true
      if (this.serverConnection$ !== null) {
        this.serverConnection$.next({
          op: NVMESSAGE.CREATE,
          key: this.sessionKey
        })
      }
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

  sendSessionMessage(message: Message): void {
    message.from = this.user.id
    if (this.isConnectedToServer && this.serverConnection$ !== null) {
      this.serverConnection$.next({
        ...message,
        key: this.sessionKey,
        userKey: this.user.key
      } as Message)
    } else {
      this.sendLocalMessage(message)
    }
  }

  // Remote
  // not included in public docs
  // Internal function to connect to web socket server
  connectToServer(serverURL: string, sessionName: string): void {
    const url = new URL(serverURL)
    url.pathname = 'websockets'
    url.search = '?session=' + sessionName
    this.serverConnection$ = webSocket(url.href)
    log.debug(url.href)
  }

  // Internal function called after a connection with the server has been made
  subscribeToServer(): void {
    if (this.serverConnection$ !== null) {
      this.serverConnection$.subscribe({
        next: (msg) => {
          this.onMessageCallback(msg)
        }, // Called whenever there is a message from the server.
        error: (err) => log.error(err), // Called if at any point WebSocket API signals some kind of error.
        complete: () => log.debug('complete') // Called when connection is closed (for whatever reason).
      })
    }
  }

  sendLocalMessage(message: Message): void {
    // add the message for each client
    for (const user of this.userList) {
      if (user.id === this.user.id) {
        continue
      }
      const userQueueName = `user-${user.id}-q`
      const userQueueText = localStorage.getItem(userQueueName)
      const userQueue = userQueueText ? JSON.parse(userQueueText) : []
      userQueue.push(message)
      localStorage.setItem(userQueueName, JSON.stringify(userQueue))
    }
  }

  localStorageEventListener(e: StorageEvent): void {
    // discard empty events
    if (!e.newValue) {
      return
    }

    // is this message for us?
    switch (e.key) {
      case this.userListName:
        {
          const newUserList = JSON.parse(e.newValue) as SessionUser[]
          const oldUserList = JSON.parse(e.oldValue ?? '[]') as SessionUser[]
          this.userList = newUserList
          // compare new and old values
          const newUsers = newUserList.filter((u) => !oldUserList.map((o) => o.id).includes(u.id))
          for (const newUser of newUsers) {
            this.onMessageCallback({
              op: NVMESSAGE.USER_JOINED,
              user: newUser
            })
          }
        }
        break
      case this.userQueueName:
        {
          const messages = JSON.parse(e.newValue)
          for (const message of messages) {
            if (this.onMessageCallback) {
              this.onMessageCallback(message)
            }
          }
          // reset our message queue
          localStorage.setItem(this.userQueueName ?? '', JSON.stringify([]))
        }
        break
    }
  }
}
