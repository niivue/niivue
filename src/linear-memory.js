import { HeapVerifier } from "./heap-verifier";

export class LinearMemory {
  constructor({ initial = 2048, maximum = 2048 }) {
    this.memory = new WebAssembly.Memory({ initial, maximum });
    this.verifier = new HeapVerifier(maximum * 65536);
  }
  record_malloc(ptr, len) {
    this.verifier.acquire(ptr, len);
  }
  record_free(ptr) {
    this.verifier.release(ptr);
  }
  read_string(offset) {
    let view = new Uint8Array(this.memory.buffer);
    let bytes = [];
    for (let byte = view[offset]; byte; byte = view[++offset]) bytes.push(byte);
    return String.fromCharCode(...bytes);
  }
  log(str) {
    console.log(`wasm log: ${str}`);
  }
  log_i(str, i) {
    console.log(`wasm log: ${str}: ${i}`);
  }
  env() {
    return {
      memory: this.memory,
      wasm_log: (off) => this.log(this.read_string(off)),
      wasm_log_i: (off, i) => this.log_i(this.read_string(off), i),
    };
  }
}
