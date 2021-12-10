let granule_size = 8;
let bits_per_byte = 8;
let bits_per_byte_log2 = 3;

function assert(c, msg) {
  if (!c) throw new Error(msg);
}
function power_of_two(x) {
  return x && (x & (x - 1)) == 0;
}
function assert_power_of_two(x) {
  assert(power_of_two(x), `not power of two: ${x}`);
}
function aligned(x, y) {
  assert_power_of_two(y);
  return (x & (y - 1)) == 0;
}

function assert_aligned(x, y) {
  assert(aligned(x, y), `bad alignment: ${x} % ${y}`);
}

export class HeapVerifier {
  constructor(maxbytes) {
    this.maxwords = maxbytes / granule_size;
    this.state = new Uint8Array(this.maxwords / bits_per_byte);
    this.allocations = new Map();
  }
  acquire(offset, len) {
    assert_aligned(offset, granule_size);
    for (let i = 0; i < len; i += granule_size) {
      let bit = (offset + i) / granule_size;
      let byte = bit >> bits_per_byte_log2;
      let mask = 1 << (bit & (bits_per_byte - 1));
      assert((this.state[byte] & mask) == 0, "word in use");
      this.state[byte] |= mask;
    }
    this.allocations.set(offset, len);
  }
  release(offset) {
    assert(this.allocations.has(offset));
    let len = this.allocations.get(offset);
    this.allocations.delete(offset);
    for (let i = 0; i < len; i += granule_size) {
      let bit = (offset + i) / granule_size;
      let byte = bit >> bits_per_byte_log2;
      let mask = 1 << (bit & (bits_per_byte - 1));
      this.state[byte] &= ~mask;
    }
  }
}
