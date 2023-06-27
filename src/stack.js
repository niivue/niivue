/**
 * @template A
 * @typedef {Object} Stack
 * @property {(element: A) => void} push push an element on top of the stack
 * @property {() => A} pop returns the top most element from the stack and remove it from the stack
 * @property {() => A} peek returns the top most element from the stack without removing it from the stack
 * @property {() => void} clear clears the stack
 */

/**
 * This class is a javascript implementation of a LIFO stack
 * @class
 * @type {Stack}
 */
class Stack {
  /**
   * Create stack
   */
  constructor() {
    this.stack = [];
  }

  /**
   * @property {Function} push push an element on top of the stack
   * @param {*} element
   */
  push(element) {
    this.stack.push(element);
  }

  /**
   * @property {Function} pop returns the top most element from the stack and remove it from the stack
   * @returns {*} the top most element from the stack
   * @throws throws, if stack is empty
   */
  pop() {
    if (this.stack.length == 0) {
      throw new Error("stack is empty");
    }
    return this.stack.pop();
  }

  /**
   * @property {Function} peek returns the top most element from the stack without removing it from the stack
   * @returns {*} the top most element from the stack or undefined if there is no element in the stack
   */
  peek() {
    return this.stack[this.stack.length - 1];
  }

  /**
   * @property {Function} clear clears the stack
   */
  clear() {
    this.stack.length = 0;
  }
}

export default Stack;
