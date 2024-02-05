// build/dev/javascript/prelude.mjs
class CustomType {
  withFields(fields) {
    let properties = Object.keys(this).map((label) => (label in fields) ? fields[label] : this[label]);
    return new this.constructor(...properties);
  }
}

class List {
  static fromArray(array, tail) {
    return toList(array, tail);
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current)
      current = current.tail;
    return current !== undefined;
  }
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current)
      current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  countLength() {
    let current = this;
    let length = 0;
    while (current) {
      current = current.tail;
      length++;
    }
    return length - 1;
  }
}
function prepend(element, tail) {
  return new NonEmpty(element, tail);
}
function toList(elements, tail) {
  let t = tail || List$Empty$const;
  for (let i = elements.length - 1;i >= 0; --i) {
    t = new NonEmpty(elements[i], t);
  }
  return t;
}

class ListIterator {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
}

class Empty extends List {
}
var List$Empty$const = new Empty;
var List$Empty = () => List$Empty$const;
var List$isEmpty = (value) => value instanceof Empty;

class NonEmpty extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
}
var List$NonEmpty = (head, tail) => new NonEmpty(head, tail);
var List$isNonEmpty = (value) => value instanceof NonEmpty;
var List$NonEmpty$first = (value) => value.head;
var List$NonEmpty$rest = (value) => value.tail;

class BitArray {
  bitSize;
  byteSize;
  bitOffset;
  rawBuffer;
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error("BitArray can only be constructed from a Uint8Array");
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(`BitArray bit offset is invalid: ${this.bitOffset}`);
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  byteAt(index) {
    if (index < 0 || index >= this.byteSize) {
      return;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index);
  }
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0;i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0;i < wholeByteCount; i++) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, wholeByteCount);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, wholeByteCount);
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  get buffer() {
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error("BitArray.buffer does not support unaligned bit arrays");
    }
    return this.rawBuffer;
  }
  get length() {
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error("BitArray.length does not support unaligned bit arrays");
    }
    return this.rawBuffer.length;
  }
}
function bitArrayByteAt(buffer, bitOffset, index) {
  if (bitOffset === 0) {
    return buffer[index] ?? 0;
  } else {
    const a = buffer[index] << bitOffset & 255;
    const b = buffer[index + 1] >> 8 - bitOffset;
    return a | b;
  }
}

class UtfCodepoint {
  constructor(value) {
    this.value = value;
  }
}
function toBitArray(segments) {
  if (segments.length === 0) {
    return new BitArray(new Uint8Array);
  }
  if (segments.length === 1) {
    const segment = segments[0];
    if (segment instanceof BitArray) {
      return segment;
    }
    if (segment instanceof Uint8Array) {
      return new BitArray(segment);
    }
    return new BitArray(new Uint8Array(segments));
  }
  let bitSize = 0;
  let areAllSegmentsNumbers = true;
  for (const segment of segments) {
    if (segment instanceof BitArray) {
      bitSize += segment.bitSize;
      areAllSegmentsNumbers = false;
    } else if (segment instanceof Uint8Array) {
      bitSize += segment.byteLength * 8;
      areAllSegmentsNumbers = false;
    } else {
      bitSize += 8;
    }
  }
  if (areAllSegmentsNumbers) {
    return new BitArray(new Uint8Array(segments));
  }
  const buffer = new Uint8Array(Math.trunc((bitSize + 7) / 8));
  let cursor = 0;
  for (let segment of segments) {
    const isCursorByteAligned = cursor % 8 === 0;
    if (segment instanceof BitArray) {
      if (isCursorByteAligned && segment.bitOffset === 0) {
        buffer.set(segment.rawBuffer, cursor / 8);
        cursor += segment.bitSize;
        const trailingBitsCount = segment.bitSize % 8;
        if (trailingBitsCount !== 0) {
          const lastByteIndex = Math.trunc(cursor / 8);
          buffer[lastByteIndex] >>= 8 - trailingBitsCount;
          buffer[lastByteIndex] <<= 8 - trailingBitsCount;
        }
      } else {
        appendUnalignedBits(segment.rawBuffer, segment.bitSize, segment.bitOffset);
      }
    } else if (segment instanceof Uint8Array) {
      if (isCursorByteAligned) {
        buffer.set(segment, cursor / 8);
        cursor += segment.byteLength * 8;
      } else {
        appendUnalignedBits(segment, segment.byteLength * 8, 0);
      }
    } else {
      if (isCursorByteAligned) {
        buffer[cursor / 8] = segment;
        cursor += 8;
      } else {
        appendUnalignedBits(new Uint8Array([segment]), 8, 0);
      }
    }
  }
  function appendUnalignedBits(unalignedBits, size, offset) {
    if (size === 0) {
      return;
    }
    const byteSize = Math.trunc(size + 7 / 8);
    const highBitsCount = cursor % 8;
    const lowBitsCount = 8 - highBitsCount;
    let byteIndex = Math.trunc(cursor / 8);
    for (let i = 0;i < byteSize; i++) {
      let byte = bitArrayByteAt(unalignedBits, offset, i);
      if (size < 8) {
        byte >>= 8 - size;
        byte <<= 8 - size;
      }
      buffer[byteIndex] |= byte >> highBitsCount;
      let appendedBitsCount = size - Math.max(0, size - lowBitsCount);
      size -= appendedBitsCount;
      cursor += appendedBitsCount;
      if (size === 0) {
        break;
      }
      buffer[++byteIndex] = byte << lowBitsCount;
      appendedBitsCount = size - Math.max(0, size - highBitsCount);
      size -= appendedBitsCount;
      cursor += appendedBitsCount;
    }
  }
  return new BitArray(buffer, bitSize);
}
var utf8Encoder;
function stringBits(string) {
  utf8Encoder ??= new TextEncoder;
  return utf8Encoder.encode(string);
}
class Result extends CustomType {
  static isResult(data) {
    return data instanceof Result;
  }
}

class Ok extends Result {
  constructor(value) {
    super();
    this[0] = value;
  }
  isOk() {
    return true;
  }
}
var Result$Ok = (value) => new Ok(value);
var Result$isOk = (value) => value instanceof Ok;
var Result$Ok$0 = (value) => value[0];

class Error extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  isOk() {
    return false;
  }
}
var Result$Error = (detail) => new Error(detail);
function isEqual(x, y) {
  let values = [x, y];
  while (values.length) {
    let a = values.pop();
    let b = values.pop();
    if (a === b)
      continue;
    if (!isObject(a) || !isObject(b))
      return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal)
      return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b))
          continue;
        else
          return false;
      } catch {}
    }
    let [keys, get] = getters(a);
    const ka = keys(a);
    const kb = keys(b);
    if (ka.length !== kb.length)
      return false;
    for (let k of ka) {
      values.push(get(a, k), get(b, k));
    }
  }
  return true;
}
function getters(object) {
  if (object instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return !(a instanceof BitArray) && a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c))
    return false;
  return a.constructor === b.constructor;
}
function divideFloat(a, b) {
  if (b === 0) {
    return 0;
  } else {
    return a / b;
  }
}
function makeError(variant, file, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.file = file;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra)
    error[k] = extra[k];
  return error;
}
// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap;
var tempDataView = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== undefined) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0;i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {}
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0;i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys = Object.keys(o);
    for (let i = 0;i < keys.length; i++) {
      const k = keys[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null)
    return 1108378658;
  if (u === undefined)
    return 1108378659;
  if (u === true)
    return 1108378657;
  if (u === false)
    return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}

class Dict {
  constructor(size, root) {
    this.size = size;
    this.root = root;
  }
}
var bits = 5;
var mask = (1 << bits) - 1;
var noElementMarker = Symbol();

class Node {
  constructor(generation, datamap, nodemap, data) {
    this.datamap = datamap;
    this.nodemap = nodemap;
    this.data = data;
    this.generation = generation;
  }
  equals(other) {
    if (this === other)
      return true;
    if (!(other instanceof Node))
      return false;
    if (this.datamap !== other.datamap || this.nodemap !== other.nodemap) {
      return false;
    }
    const leftData = this.data;
    const rightData = other.data;
    if (leftData.length !== rightData.length)
      return false;
    if (this.datamap === 0 && this.nodemap === 0) {
      return this.#equalsOverflowEntries(rightData);
    }
    const edgesStart = leftData.length - popcount(this.nodemap);
    for (let i = 0;i < edgesStart; i += 2) {
      if (!isEqual(leftData[i], rightData[i]) || !isEqual(leftData[i + 1], rightData[i + 1])) {
        return false;
      }
    }
    for (let i = edgesStart;i < leftData.length; ++i) {
      if (!leftData[i].equals(rightData[i]))
        return false;
    }
    return true;
  }
  #equalsOverflowEntries(otherData) {
    const data = this.data;
    entries:
      for (let i = 0;i < data.length; i += 2) {
        for (let j = 0;j < otherData.length; j += 2) {
          if (isEqual(data[i], otherData[j])) {
            if (!isEqual(data[i + 1], otherData[j + 1]))
              return false;
            continue entries;
          }
        }
        return false;
      }
    return true;
  }
  hashCode() {
    const data = this.data;
    const edgesStart = data.length - popcount(this.nodemap);
    let hash = 0;
    for (let i = 0;i < edgesStart; i += 2) {
      hash = hash + hashMerge(getHash(data[i + 1]), getHash(data[i])) | 0;
    }
    for (let i = edgesStart;i < data.length; ++i) {
      hash = hash + data[i].hashCode() | 0;
    }
    return hash;
  }
}
var emptyNode = /* @__PURE__ */ newNode(0);
var emptyDict = /* @__PURE__ */ new Dict(0, emptyNode);
var errorNil = /* @__PURE__ */ Result$Error(undefined);
function newNode(generation) {
  return new Node(generation, 0, 0, []);
}
function copyNode(node, generation) {
  if (node.generation === generation) {
    return node;
  }
  const newData = node.data.slice(0);
  return new Node(generation, node.datamap, node.nodemap, newData);
}
function copyAndSet(node, generation, idx, val) {
  if (node.data[idx] === val) {
    return node;
  }
  node = copyNode(node, generation);
  node.data[idx] = val;
  return node;
}
function copyAndInsertPair(node, generation, bit, idx, key, val) {
  const data = node.data;
  const length = data.length;
  const newData = new Array(length + 2);
  let readIndex = 0;
  let writeIndex = 0;
  while (readIndex < idx)
    newData[writeIndex++] = data[readIndex++];
  newData[writeIndex++] = key;
  newData[writeIndex++] = val;
  while (readIndex < length)
    newData[writeIndex++] = data[readIndex++];
  return new Node(generation, node.datamap | bit, node.nodemap, newData);
}
function copyAndRemovePair(node, generation, bit, idx) {
  node = copyNode(node, generation);
  const data = node.data;
  const length = data.length;
  for (let w = idx, r = idx + 2;r < length; ++r, ++w) {
    data[w] = data[r];
  }
  data.pop();
  data.pop();
  node.datamap ^= bit;
  return node;
}
function make() {
  return emptyDict;
}
function size(dict) {
  return dict.size;
}
function get(dict, key) {
  const result = lookup(dict.root, key, getHash(key));
  return result !== noElementMarker ? Result$Ok(result) : errorNil;
}
function lookup(node, key, hash) {
  for (let shift = 0;shift < 32; shift += bits) {
    const data = node.data;
    const bit = hashbit(hash, shift);
    if (node.nodemap & bit) {
      node = data[data.length - 1 - index(node.nodemap, bit)];
    } else if (node.datamap & bit) {
      const dataidx = Math.imul(index(node.datamap, bit), 2);
      return isEqual(key, data[dataidx]) ? data[dataidx + 1] : noElementMarker;
    } else {
      return noElementMarker;
    }
  }
  const overflow = node.data;
  for (let i = 0;i < overflow.length; i += 2) {
    if (isEqual(key, overflow[i])) {
      return overflow[i + 1];
    }
  }
  return noElementMarker;
}
function toTransient(dict) {
  return {
    generation: nextGeneration(dict),
    root: dict.root,
    size: dict.size,
    dict
  };
}
function fromTransient(transient) {
  if (transient.root === transient.dict.root) {
    return transient.dict;
  }
  return new Dict(transient.size, transient.root);
}
function nextGeneration(dict) {
  const root = dict.root;
  if (root.generation < Number.MAX_SAFE_INTEGER) {
    return root.generation + 1;
  }
  const queue = [root];
  while (queue.length) {
    const node = queue.pop();
    node.generation = 0;
    const nodeStart = node.data.length - popcount(node.nodemap);
    for (let i = nodeStart;i < node.data.length; ++i) {
      queue.push(node.data[i]);
    }
  }
  return 1;
}
var globalTransient = /* @__PURE__ */ toTransient(emptyDict);
function insert(dict, key, value) {
  globalTransient.generation = nextGeneration(dict);
  globalTransient.size = dict.size;
  const hash = getHash(key);
  const root = insertIntoNode(globalTransient, dict.root, key, value, hash, 0);
  if (root === dict.root) {
    return dict;
  }
  return new Dict(globalTransient.size, root);
}
function insertIntoNode(transient, node, key, value, hash, shift) {
  const data = node.data;
  const generation = transient.generation;
  if (shift > 32) {
    for (let i = 0;i < data.length; i += 2) {
      if (isEqual(key, data[i])) {
        return copyAndSet(node, generation, i + 1, value);
      }
    }
    transient.size += 1;
    return copyAndInsertPair(node, generation, 0, data.length, key, value);
  }
  const bit = hashbit(hash, shift);
  if (node.nodemap & bit) {
    const nodeidx2 = data.length - 1 - index(node.nodemap, bit);
    let child2 = data[nodeidx2];
    child2 = insertIntoNode(transient, child2, key, value, hash, shift + bits);
    return copyAndSet(node, generation, nodeidx2, child2);
  }
  const dataidx = Math.imul(index(node.datamap, bit), 2);
  if ((node.datamap & bit) === 0) {
    transient.size += 1;
    return copyAndInsertPair(node, generation, bit, dataidx, key, value);
  }
  if (isEqual(key, data[dataidx])) {
    return copyAndSet(node, generation, dataidx + 1, value);
  }
  const childShift = shift + bits;
  let child = emptyNode;
  child = insertIntoNode(transient, child, key, value, hash, childShift);
  const key2 = data[dataidx];
  const value2 = data[dataidx + 1];
  const hash2 = getHash(key2);
  child = insertIntoNode(transient, child, key2, value2, hash2, childShift);
  transient.size -= 1;
  const length = data.length;
  const nodeidx = length - 1 - index(node.nodemap, bit);
  const newData = new Array(length - 1);
  let readIndex = 0;
  let writeIndex = 0;
  while (readIndex < dataidx)
    newData[writeIndex++] = data[readIndex++];
  readIndex += 2;
  while (readIndex <= nodeidx)
    newData[writeIndex++] = data[readIndex++];
  newData[writeIndex++] = child;
  while (readIndex < length)
    newData[writeIndex++] = data[readIndex++];
  return new Node(generation, node.datamap ^ bit, node.nodemap | bit, newData);
}
function destructiveTransientDelete(key, transient) {
  const hash = getHash(key);
  transient.root = deleteFromNode(transient, transient.root, key, hash, 0);
  return transient;
}
function deleteFromNode(transient, node, key, hash, shift) {
  const data = node.data;
  const generation = transient.generation;
  if (shift > 32) {
    for (let i = 0;i < data.length; i += 2) {
      if (isEqual(key, data[i])) {
        transient.size -= 1;
        return copyAndRemovePair(node, generation, 0, i);
      }
    }
    return node;
  }
  const bit = hashbit(hash, shift);
  const dataidx = Math.imul(index(node.datamap, bit), 2);
  if ((node.nodemap & bit) !== 0) {
    const nodeidx = data.length - 1 - index(node.nodemap, bit);
    let child = data[nodeidx];
    child = deleteFromNode(transient, child, key, hash, shift + bits);
    if (child.nodemap !== 0 || child.data.length > 2) {
      return copyAndSet(node, generation, nodeidx, child);
    }
    const length = data.length;
    const newData = new Array(length + 1);
    let readIndex = 0;
    let writeIndex = 0;
    while (readIndex < dataidx)
      newData[writeIndex++] = data[readIndex++];
    newData[writeIndex++] = child.data[0];
    newData[writeIndex++] = child.data[1];
    while (readIndex < nodeidx)
      newData[writeIndex++] = data[readIndex++];
    readIndex++;
    while (readIndex < length)
      newData[writeIndex++] = data[readIndex++];
    return new Node(generation, node.datamap | bit, node.nodemap ^ bit, newData);
  }
  if ((node.datamap & bit) === 0 || !isEqual(key, data[dataidx])) {
    return node;
  }
  transient.size -= 1;
  return copyAndRemovePair(node, generation, bit, dataidx);
}
function map(dict, fun) {
  const generation = nextGeneration(dict);
  const root = copyNode(dict.root, generation);
  const queue = [root];
  while (queue.length) {
    const node = queue.pop();
    const data = node.data;
    const edgesStart = data.length - popcount(node.nodemap);
    for (let i = 0;i < edgesStart; i += 2) {
      data[i + 1] = fun(data[i], data[i + 1]);
    }
    for (let i = edgesStart;i < data.length; ++i) {
      data[i] = copyNode(data[i], generation);
      queue.push(data[i]);
    }
  }
  return new Dict(dict.size, root);
}
function fold(dict, state, fun) {
  const queue = [dict.root];
  while (queue.length) {
    const node = queue.pop();
    const data = node.data;
    const edgesStart = data.length - popcount(node.nodemap);
    for (let i = 0;i < edgesStart; i += 2) {
      state = fun(state, data[i], data[i + 1]);
    }
    for (let i = edgesStart;i < data.length; ++i) {
      queue.push(data[i]);
    }
  }
  return state;
}
function popcount(n) {
  n -= n >>> 1 & 1431655765;
  n = (n & 858993459) + (n >>> 2 & 858993459);
  return Math.imul(n + (n >>> 4) & 252645135, 16843009) >>> 24;
}
function index(bitmap, bit) {
  return popcount(bitmap & bit - 1);
}
function hashbit(hash, shift) {
  return 1 << (hash >>> shift & mask);
}

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
class Some extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
var Option$isSome = (value) => value instanceof Some;
var Option$Some$0 = (value) => value[0];

class None extends CustomType {
}
var Option$None$const = new None;
function unwrap(option, default$) {
  if (option instanceof Some) {
    let x = option[0];
    return x;
  } else {
    return default$;
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function to_list(dict) {
  return fold(dict, List$Empty$const, (acc, key, value) => {
    return prepend([key, value], acc);
  });
}
function keys(dict) {
  return fold(dict, List$Empty$const, (acc, key, _) => {
    return prepend(key, acc);
  });
}
function delete$(dict, key) {
  let _pipe = toTransient(dict);
  let _pipe$1 = ((_capture) => {
    return destructiveTransientDelete(key, _capture);
  })(_pipe);
  return fromTransient(_pipe$1);
}
function upsert(dict, key, fun) {
  let $ = get(dict, key);
  if ($ instanceof Ok) {
    let value = $[0];
    return insert(dict, key, fun(new Some(value)));
  } else {
    return insert(dict, key, fun(Option$None$const));
  }
}

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
class Lt extends CustomType {
}
var Order$Lt$const = new Lt;
var Order$Lt = () => Order$Lt$const;
class Eq extends CustomType {
}
var Order$Eq$const = new Eq;
var Order$Eq = () => Order$Eq$const;
class Gt extends CustomType {
}
var Order$Gt$const = new Gt;
var Order$Gt = () => Order$Gt$const;

// build/dev/javascript/gleam_stdlib/gleam/float.mjs
function negate(x) {
  return -1 * x;
}
function round2(x) {
  let $ = x >= 0;
  if ($) {
    return round(x);
  } else {
    return 0 - round(negate(x));
  }
}
function logarithm(x) {
  let $ = x <= 0;
  if ($) {
    return new Error(undefined);
  } else {
    return new Ok(log(x));
  }
}

// build/dev/javascript/gleam_stdlib/gleam/int.mjs
function absolute_value(x) {
  let $ = x >= 0;
  if ($) {
    return x;
  } else {
    return x * -1;
  }
}
function max(a, b) {
  let $ = a > b;
  if ($) {
    return a;
  } else {
    return b;
  }
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
class Ascending extends CustomType {
}
var Sorting$Ascending$const = new Ascending;

class Descending extends CustomType {
}
var Sorting$Descending$const = new Descending;
function length_loop(loop$list, loop$count) {
  while (true) {
    let list = loop$list;
    let count = loop$count;
    if (list instanceof Empty) {
      return count;
    } else {
      let list$1 = list.tail;
      loop$list = list$1;
      loop$count = count + 1;
    }
  }
}
function length(list) {
  return length_loop(list, 0);
}
function count_loop(loop$list, loop$predicate, loop$acc) {
  while (true) {
    let list = loop$list;
    let predicate = loop$predicate;
    let acc = loop$acc;
    if (list instanceof Empty) {
      return acc;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let $ = predicate(first$1);
      if ($) {
        loop$list = rest$1;
        loop$predicate = predicate;
        loop$acc = acc + 1;
      } else {
        loop$list = rest$1;
        loop$predicate = predicate;
        loop$acc = acc;
      }
    }
  }
}
function count(list, predicate) {
  return count_loop(list, predicate, 0);
}
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix instanceof Empty) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list) {
  return reverse_and_prepend(list, List$Empty$const);
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let _block;
      let $ = fun(first$1);
      if ($) {
        _block = prepend(first$1, acc);
      } else {
        _block = acc;
      }
      let new_acc = _block;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list, predicate) {
  return filter_loop(list, predicate, List$Empty$const);
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map2(list, fun) {
  return map_loop(list, fun, List$Empty$const);
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first = loop$first;
    let second = loop$second;
    if (first instanceof Empty) {
      return second;
    } else {
      let first$1 = first.head;
      let rest$1 = first.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first, second) {
  return append_loop(reverse(first), second);
}
function prepend2(list, item) {
  return prepend(item, list);
}
function flatten_loop(loop$lists, loop$acc) {
  while (true) {
    let lists = loop$lists;
    let acc = loop$acc;
    if (lists instanceof Empty) {
      return reverse(acc);
    } else {
      let list = lists.head;
      let further_lists = lists.tail;
      loop$lists = further_lists;
      loop$acc = reverse_and_prepend(list, acc);
    }
  }
}
function flatten(lists) {
  return flatten_loop(lists, List$Empty$const);
}
function flat_map(list, fun) {
  return flatten(map2(list, fun));
}
function fold2(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list instanceof Empty) {
      return initial;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function any(loop$list, loop$predicate) {
  while (true) {
    let list = loop$list;
    let predicate = loop$predicate;
    if (list instanceof Empty) {
      return false;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let $ = predicate(first$1);
      if ($) {
        return $;
      } else {
        loop$list = rest$1;
        loop$predicate = predicate;
      }
    }
  }
}
function zip_loop(loop$one, loop$other, loop$acc) {
  while (true) {
    let one = loop$one;
    let other = loop$other;
    let acc = loop$acc;
    if (one instanceof Empty) {
      return reverse(acc);
    } else if (other instanceof Empty) {
      return reverse(acc);
    } else {
      let first_one = one.head;
      let rest_one = one.tail;
      let first_other = other.head;
      let rest_other = other.tail;
      loop$one = rest_one;
      loop$other = rest_other;
      loop$acc = prepend([first_one, first_other], acc);
    }
  }
}
function zip(list, other) {
  return zip_loop(list, other, List$Empty$const);
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list2 = loop$list2;
    let compare2 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list = list2;
      return reverse_and_prepend(list, acc);
    } else if (list2 instanceof Empty) {
      let list = list1;
      return reverse_and_prepend(list, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list2.head;
      let rest2 = list2.tail;
      let $ = compare2(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare2;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = rest1;
        loop$list2 = list2;
        loop$compare = compare2;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list2;
        loop$compare = compare2;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences = loop$sequences;
    let compare2 = loop$compare;
    let acc = loop$acc;
    if (sequences instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences.tail;
      if ($ instanceof Empty) {
        let sequence = sequences.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let descending1 = sequences.head;
        let descending2 = $.head;
        let rest$1 = $.tail;
        let ascending = merge_descendings(descending1, descending2, compare2, List$Empty$const);
        loop$sequences = rest$1;
        loop$compare = compare2;
        loop$acc = prepend(ascending, acc);
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list2 = loop$list2;
    let compare2 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list = list2;
      return reverse_and_prepend(list, acc);
    } else if (list2 instanceof Empty) {
      let list = list1;
      return reverse_and_prepend(list, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list2.head;
      let rest2 = list2.tail;
      let $ = compare2(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list2;
        loop$compare = compare2;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare2;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare2;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences = loop$sequences;
    let compare2 = loop$compare;
    let acc = loop$acc;
    if (sequences instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences.tail;
      if ($ instanceof Empty) {
        let sequence = sequences.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let ascending1 = sequences.head;
        let ascending2 = $.head;
        let rest$1 = $.tail;
        let descending = merge_ascendings(ascending1, ascending2, compare2, List$Empty$const);
        loop$sequences = rest$1;
        loop$compare = compare2;
        loop$acc = prepend(descending, acc);
      }
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences = loop$sequences;
    let direction = loop$direction;
    let compare2 = loop$compare;
    if (sequences instanceof Empty) {
      return sequences;
    } else if (direction instanceof Ascending) {
      let $ = sequences.tail;
      if ($ instanceof Empty) {
        let sequence = sequences.head;
        return sequence;
      } else {
        let sequences$1 = merge_ascending_pairs(sequences, compare2, List$Empty$const);
        loop$sequences = sequences$1;
        loop$direction = Sorting$Descending$const;
        loop$compare = compare2;
      }
    } else {
      let $ = sequences.tail;
      if ($ instanceof Empty) {
        let sequence = sequences.head;
        return reverse(sequence);
      } else {
        let sequences$1 = merge_descending_pairs(sequences, compare2, List$Empty$const);
        loop$sequences = sequences$1;
        loop$direction = Sorting$Ascending$const;
        loop$compare = compare2;
      }
    }
  }
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list = loop$list;
    let compare2 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list instanceof Empty) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list.head;
      let rest$1 = list.tail;
      let $ = compare2(prev, new$1);
      if (direction instanceof Ascending) {
        if ($ instanceof Lt) {
          loop$list = rest$1;
          loop$compare = compare2;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else if ($ instanceof Eq) {
          loop$list = rest$1;
          loop$compare = compare2;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else {
          let _block;
          if (direction instanceof Ascending) {
            _block = prepend(reverse(growing$1), acc);
          } else {
            _block = prepend(growing$1, acc);
          }
          let acc$1 = _block;
          if (rest$1 instanceof Empty) {
            return prepend(toList([new$1]), acc$1);
          } else {
            let next = rest$1.head;
            let rest$2 = rest$1.tail;
            let _block$1;
            let $1 = compare2(new$1, next);
            if ($1 instanceof Lt) {
              _block$1 = Sorting$Ascending$const;
            } else if ($1 instanceof Eq) {
              _block$1 = Sorting$Ascending$const;
            } else {
              _block$1 = Sorting$Descending$const;
            }
            let direction$1 = _block$1;
            loop$list = rest$2;
            loop$compare = compare2;
            loop$growing = toList([new$1]);
            loop$direction = direction$1;
            loop$prev = next;
            loop$acc = acc$1;
          }
        }
      } else if ($ instanceof Lt) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare2(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = Sorting$Ascending$const;
          } else if ($1 instanceof Eq) {
            _block$1 = Sorting$Ascending$const;
          } else {
            _block$1 = Sorting$Descending$const;
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare2;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Eq) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare2(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = Sorting$Ascending$const;
          } else if ($1 instanceof Eq) {
            _block$1 = Sorting$Ascending$const;
          } else {
            _block$1 = Sorting$Descending$const;
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare2;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        loop$list = rest$1;
        loop$compare = compare2;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      }
    }
  }
}
function sort(list, compare2) {
  if (list instanceof Empty) {
    return list;
  } else {
    let $ = list.tail;
    if ($ instanceof Empty) {
      return list;
    } else {
      let x = list.head;
      let y = $.head;
      let rest$1 = $.tail;
      let _block;
      let $1 = compare2(x, y);
      if ($1 instanceof Lt) {
        _block = Sorting$Ascending$const;
      } else if ($1 instanceof Eq) {
        _block = Sorting$Ascending$const;
      } else {
        _block = Sorting$Descending$const;
      }
      let direction = _block;
      let sequences$1 = sequences(rest$1, compare2, toList([x]), direction, y, List$Empty$const);
      return merge_all(sequences$1, Sorting$Ascending$const, compare2);
    }
  }
}
function each(loop$list, loop$f) {
  while (true) {
    let list = loop$list;
    let f = loop$f;
    if (list instanceof Empty) {
      return;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      f(first$1);
      loop$list = rest$1;
      loop$f = f;
    }
  }
}

// build/dev/javascript/gleam_stdlib/gleam/string_tree.mjs
class All extends CustomType {
}
var Direction$All$const = new All;
function reverse2(tree) {
  let _pipe = tree;
  let _pipe$1 = identity(_pipe);
  let _pipe$2 = graphemes(_pipe$1);
  let _pipe$3 = reverse(_pipe$2);
  return concat(_pipe$3);
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
class Leading extends CustomType {
}
var Direction$Leading$const = new Leading;

class Trailing extends CustomType {
}
var Direction$Trailing$const = new Trailing;
function reverse3(string) {
  let _pipe = string;
  let _pipe$1 = identity(_pipe);
  let _pipe$2 = reverse2(_pipe$1);
  return identity(_pipe$2);
}
function replace(string, pattern, substitute) {
  let _pipe = string;
  let _pipe$1 = identity(_pipe);
  let _pipe$2 = string_replace(_pipe$1, pattern, substitute);
  return identity(_pipe$2);
}
function compare2(a, b) {
  let $ = a === b;
  if ($) {
    return Order$Eq$const;
  } else {
    let $1 = less_than(a, b);
    if ($1) {
      return Order$Lt$const;
    } else {
      return Order$Gt$const;
    }
  }
}
function slice(string, idx, len) {
  let $ = len <= 0;
  if ($) {
    return "";
  } else {
    let $1 = idx < 0;
    if ($1) {
      let translated_idx = string_length(string) + idx;
      let $2 = translated_idx < 0;
      if ($2) {
        return "";
      } else {
        return string_grapheme_slice(string, translated_idx, len);
      }
    } else {
      return string_grapheme_slice(string, idx, len);
    }
  }
}
function drop_start(string, num_graphemes) {
  let $ = num_graphemes <= 0;
  if ($) {
    return string;
  } else {
    let prefix = string_grapheme_slice(string, 0, num_graphemes);
    let prefix_size = byte_size(prefix);
    return string_byte_slice(string, prefix_size, byte_size(string) - prefix_size);
  }
}
function drop_end(string, num_graphemes) {
  let $ = num_graphemes <= 0;
  if ($) {
    return string;
  } else {
    return slice(string, 0, string_length(string) - num_graphemes);
  }
}
function split2(x, substring) {
  if (substring === "") {
    return graphemes(x);
  } else {
    let _pipe = x;
    let _pipe$1 = identity(_pipe);
    let _pipe$2 = split(_pipe$1, substring);
    return map2(_pipe$2, identity);
  }
}
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
}
function repeat_loop(loop$times, loop$doubling_acc, loop$acc) {
  while (true) {
    let times = loop$times;
    let doubling_acc = loop$doubling_acc;
    let acc = loop$acc;
    let _block;
    let $ = times % 2;
    if ($ === 0) {
      _block = acc;
    } else {
      _block = acc + doubling_acc;
    }
    let acc$1 = _block;
    let times$1 = globalThis.Math.trunc(times / 2);
    let $1 = times$1 <= 0;
    if ($1) {
      return acc$1;
    } else {
      loop$times = times$1;
      loop$doubling_acc = doubling_acc + doubling_acc;
      loop$acc = acc$1;
    }
  }
}
function repeat(string, times) {
  let $ = times <= 0;
  if ($) {
    return "";
  } else {
    return repeat_loop(times, string, "");
  }
}
function join_loop(loop$strings, loop$separator, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let separator = loop$separator;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$separator = separator;
      loop$accumulator = accumulator + separator + string;
    }
  }
}
function join(strings, separator) {
  if (strings instanceof Empty) {
    return "";
  } else {
    let first$1 = strings.head;
    let rest = strings.tail;
    return join_loop(rest, separator, first$1);
  }
}
function trim(string) {
  let _pipe = string;
  let _pipe$1 = trim_start(_pipe);
  return trim_end(_pipe$1);
}
function first(string) {
  let $ = pop_grapheme(string);
  if ($ instanceof Ok) {
    let first$1 = $[0][0];
    return new Ok(first$1);
  } else {
    return $;
  }
}
function inspect2(term) {
  let _pipe = term;
  let _pipe$1 = inspect(_pipe);
  return identity(_pipe$1);
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
class Decoder extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
}
function run(data, decoder) {
  let $ = decoder.function(data);
  let maybe_invalid_data = $[0];
  let errors = $[1];
  if (errors instanceof Empty) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error(errors);
  }
}
function map3(decoder, transformer) {
  return new Decoder((d) => {
    let $ = decoder.function(d);
    let data = $[0];
    let errors = $[1];
    return [transformer(data), errors];
  });
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = undefined;
function identity(x) {
  return x;
}
function parse_int(value) {
  if (/^[-+]?(\d+)$/.test(value)) {
    return Result$Ok(parseInt(value));
  } else {
    return Result$Error(Nil);
  }
}
function to_string(term) {
  return term.toString();
}
function string_replace(string2, target, substitute) {
  return string2.replaceAll(target, substitute);
}
function string_length(string2) {
  if (string2 === "") {
    return 0;
  }
  const iterator = graphemes_iterator(string2);
  if (iterator) {
    let i = 0;
    for (const _ of iterator) {
      i++;
    }
    return i;
  } else {
    return string2.match(/./gsu).length;
  }
}
function graphemes(string2) {
  const iterator = graphemes_iterator(string2);
  if (iterator) {
    return arrayToList(Array.from(iterator).map((item) => item.segment));
  } else {
    return arrayToList(string2.match(/./gsu));
  }
}
var segmenter = undefined;
function graphemes_iterator(string2) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter;
    return segmenter.segment(string2)[Symbol.iterator]();
  }
}
function pop_grapheme(string2) {
  let first2;
  const iterator = graphemes_iterator(string2);
  if (iterator) {
    first2 = iterator.next().value?.segment;
  } else {
    first2 = string2.match(/./su)?.[0];
  }
  if (first2) {
    return Result$Ok([first2, string2.slice(first2.length)]);
  } else {
    return Result$Error(Nil);
  }
}
function less_than(a, b) {
  return a < b;
}
function split(xs, pattern) {
  return arrayToList(xs.split(pattern));
}
function concat(xs) {
  let result = "";
  for (const x of xs) {
    result = result + x;
  }
  return result;
}
function string_byte_slice(string2, index3, length3) {
  return string2.slice(index3, index3 + length3);
}
function string_grapheme_slice(string2, idx, len) {
  if (len <= 0 || idx >= string2.length) {
    return "";
  }
  const iterator = graphemes_iterator(string2);
  if (iterator) {
    while (idx-- > 0) {
      iterator.next();
    }
    let result = "";
    while (len-- > 0) {
      const v = iterator.next().value;
      if (v === undefined) {
        break;
      }
      result += v.segment;
    }
    return result;
  } else {
    return string2.match(/./gsu).slice(idx, idx + len).join("");
  }
}
function contains_string(haystack, needle) {
  return haystack.indexOf(needle) >= 0;
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
function ends_with(haystack, needle) {
  return haystack.endsWith(needle);
}
function split_once(haystack, needle) {
  const index3 = haystack.indexOf(needle);
  if (index3 >= 0) {
    const before = haystack.slice(0, index3);
    const after = haystack.slice(index3 + needle.length);
    return Result$Ok([before, after]);
  } else {
    return Result$Error(Nil);
  }
}
var unicode_whitespaces = [
  " ",
  "\t",
  `
`,
  "\v",
  "\f",
  "\r",
  "",
  "\u2028",
  "\u2029"
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(`^[${unicode_whitespaces}]*`);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function trim_start(string2) {
  return string2.replace(trim_start_regex, "");
}
function trim_end(string2) {
  return string2.replace(trim_end_regex, "");
}
function round(float2) {
  return Math.round(float2);
}
function percent_encode(string2) {
  return encodeURIComponent(string2).replaceAll("%2B", "+");
}
function byte_size(string2) {
  return new TextEncoder().encode(string2).length;
}
var MIN_I32 = -(2 ** 31);
var MAX_I32 = 2 ** 31 - 1;
var U32 = 2 ** 32;
var MAX_SAFE = Number.MAX_SAFE_INTEGER;
var MIN_SAFE = Number.MIN_SAFE_INTEGER;
function inspect(v) {
  return new Inspector().inspect(v);
}
function float_to_string(float2) {
  const string2 = float2.toString().replace("+", "");
  if (string2.indexOf(".") >= 0) {
    return string2;
  } else {
    const index3 = string2.indexOf("e");
    if (index3 >= 0) {
      return string2.slice(0, index3) + ".0" + string2.slice(index3);
    } else {
      return string2 + ".0";
    }
  }
}

class Inspector {
  #references = new Set;
  inspect(v) {
    const t = typeof v;
    if (v === true)
      return "True";
    if (v === false)
      return "False";
    if (v === null)
      return "//js(null)";
    if (v === undefined)
      return "Nil";
    if (t === "string")
      return this.#string(v);
    if (t === "bigint" || Number.isInteger(v))
      return v.toString();
    if (t === "number")
      return float_to_string(v);
    if (v instanceof UtfCodepoint)
      return this.#utfCodepoint(v);
    if (v instanceof BitArray)
      return this.#bit_array(v);
    if (v instanceof RegExp)
      return `//js(${v})`;
    if (v instanceof Date)
      return `//js(Date("${v.toISOString()}"))`;
    if (v instanceof globalThis.Error)
      return `//js(${v.toString()})`;
    if (v instanceof Function) {
      const args = [];
      for (const i of Array(v.length).keys())
        args.push(String.fromCharCode(i + 97));
      return `//fn(${args.join(", ")}) { ... }`;
    }
    if (this.#references.size === this.#references.add(v).size) {
      return "//js(circular reference)";
    }
    let printed;
    if (Array.isArray(v)) {
      printed = `#(${v.map((v2) => this.inspect(v2)).join(", ")})`;
    } else if (isList(v)) {
      printed = this.#list(v);
    } else if (v instanceof CustomType) {
      printed = this.#customType(v);
    } else if (v instanceof Dict) {
      printed = this.#dict(v);
    } else if (v instanceof Set) {
      return `//js(Set(${[...v].map((v2) => this.inspect(v2)).join(", ")}))`;
    } else {
      printed = this.#object(v);
    }
    this.#references.delete(v);
    return printed;
  }
  #object(v) {
    const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
    const props = [];
    for (const k of Object.keys(v)) {
      props.push(`${this.inspect(k)}: ${this.inspect(v[k])}`);
    }
    const body = props.length ? " " + props.join(", ") + " " : "";
    const head = name === "Object" ? "" : name + " ";
    return `//js(${head}{${body}})`;
  }
  #dict(map4) {
    let body = "dict.from_list([";
    let first2 = true;
    body = fold(map4, body, (body2, key, value) => {
      if (!first2)
        body2 = body2 + ", ";
      first2 = false;
      return body2 + "#(" + this.inspect(key) + ", " + this.inspect(value) + ")";
    });
    return body + "])";
  }
  #customType(record) {
    const props = Object.keys(record).map((label) => {
      const value = this.inspect(record[label]);
      return isNaN(parseInt(label)) ? `${label}: ${value}` : value;
    }).join(", ");
    return props ? `${record.constructor.name}(${props})` : record.constructor.name;
  }
  #list(list2) {
    if (List$isEmpty(list2)) {
      return "[]";
    }
    let char_out = 'charlist.from_string("';
    let list_out = "[";
    let current = list2;
    while (List$isNonEmpty(current)) {
      let element = current.head;
      current = current.tail;
      if (list_out !== "[") {
        list_out += ", ";
      }
      list_out += this.inspect(element);
      if (char_out) {
        if (Number.isInteger(element) && element >= 32 && element <= 126) {
          char_out += String.fromCharCode(element);
        } else {
          char_out = null;
        }
      }
    }
    if (char_out) {
      return char_out + '")';
    } else {
      return list_out + "]";
    }
  }
  #string(str) {
    let new_str = '"';
    for (let i = 0;i < str.length; i++) {
      const char = str[i];
      switch (char) {
        case `
`:
          new_str += "\\n";
          break;
        case "\r":
          new_str += "\\r";
          break;
        case "\t":
          new_str += "\\t";
          break;
        case "\f":
          new_str += "\\f";
          break;
        case "\\":
          new_str += "\\\\";
          break;
        case '"':
          new_str += "\\\"";
          break;
        default:
          if (char < " " || char > "~" && char < " ") {
            new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
          } else {
            new_str += char;
          }
      }
    }
    new_str += '"';
    return new_str;
  }
  #utfCodepoint(codepoint2) {
    return `//utfcodepoint(${String.fromCodePoint(codepoint2.value)})`;
  }
  #bit_array(bits2) {
    if (bits2.bitSize === 0) {
      return "<<>>";
    }
    let acc = "<<";
    for (let i = 0;i < bits2.byteSize - 1; i++) {
      acc += bits2.byteAt(i).toString();
      acc += ", ";
    }
    if (bits2.byteSize * 8 === bits2.bitSize) {
      acc += bits2.byteAt(bits2.byteSize - 1).toString();
    } else {
      const trailingBitsCount = bits2.bitSize % 8;
      acc += bits2.byteAt(bits2.byteSize - 1) >> 8 - trailingBitsCount;
      acc += `:size(${trailingBitsCount})`;
    }
    acc += ">>";
    return acc;
  }
}
function log(x) {
  return Math.log(x);
}
function arrayToList(array) {
  let list2 = List$Empty();
  let i = array.length;
  while (i--) {
    list2 = List$NonEmpty(array[i], list2);
  }
  return list2;
}
function isList(data) {
  return List$isEmpty(data) || List$isNonEmpty(data);
}
// build/dev/javascript/gleam_erlang/gleam/erlang/process.mjs
class Normal extends CustomType {
}
var ExitReason$Normal$const = new Normal;
class Killed extends CustomType {
}
var ExitReason$Killed$const = new Killed;
class Anything extends CustomType {
}
var AnythingSelectorTag$Anything$const = new Anything;

class Process extends CustomType {
}
var ProcessMonitorFlag$Process$const = new Process;
class TimerNotFound extends CustomType {
}
var Cancelled$TimerNotFound$const = new TimerNotFound;
class Kill extends CustomType {
}
var KillFlag$Kill$const = new Kill;

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function map4(result, fun) {
  if (result instanceof Ok) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    return result;
  }
}
function try$(result, fun) {
  if (result instanceof Ok) {
    let x = result[0];
    return fun(x);
  } else {
    return result;
  }
}
function unwrap2(result, default$) {
  if (result instanceof Ok) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}
function lazy_unwrap(result, default$) {
  if (result instanceof Ok) {
    let v = result[0];
    return v;
  } else {
    return default$();
  }
}
// build/dev/javascript/gleam_otp/gleam/otp/system.mjs
class Running extends CustomType {
}
var Mode$Running$const = new Running;
class Suspended extends CustomType {
}
var Mode$Suspended$const = new Suspended;
class NoDebug extends CustomType {
}
var DebugOption$NoDebug$const = new NoDebug;

// build/dev/javascript/gleam_otp/gleam/otp/actor.mjs
class InitTimeout extends CustomType {
}
var StartError$InitTimeout$const = new InitTimeout;

// build/dev/javascript/gleam_otp/gleam/otp/supervision.mjs
class Permanent extends CustomType {
}
var Restart$Permanent$const = new Permanent;
class Transient extends CustomType {
}
var Restart$Transient$const = new Transient;
class Temporary extends CustomType {
}
var Restart$Temporary$const = new Temporary;
class Supervisor extends CustomType {
}
var ChildType$Supervisor$const = new Supervisor;

// build/dev/javascript/gleam_otp/gleam/otp/factory_supervisor.mjs
class SimpleOneForOne extends CustomType {
}
var Strategy$SimpleOneForOne$const = new SimpleOneForOne;

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}
function lazy_guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence();
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity2(x) {
  return x;
}
// build/dev/javascript/gleam_json/gleam_json_ffi.mjs
function identity3(x) {
  return x;
}

// build/dev/javascript/gleam_json/gleam/json.mjs
class UnexpectedEndOfInput extends CustomType {
}
var DecodeError$UnexpectedEndOfInput$const = new UnexpectedEndOfInput;
function bool(input) {
  return identity3(input);
}
// build/dev/javascript/houdini/houdini.ffi.mjs
function escape(string2) {
  return string2.replaceAll(/[><&"']/g, (replaced) => {
    switch (replaced) {
      case ">":
        return "&gt;";
      case "<":
        return "&lt;";
      case "'":
        return "&#39;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      default:
        return replaced;
    }
  });
}

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = List$Empty$const;
var error_nil = /* @__PURE__ */ new Error(undefined);
function singleton_list(item) {
  return prepend(item, empty_list);
}

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ Order$Gt();
var LT = /* @__PURE__ */ Order$Lt();
var EQ = /* @__PURE__ */ Order$Eq();
function compare3(a, b) {
  if (a.name === b.name) {
    return EQ;
  } else if (a.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
class Attribute extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
}
class Property extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
}
class Event2 extends CustomType {
  constructor(kind, name, handler, include, prevent_default, stop_propagation, debounce, throttle) {
    super();
    this.kind = kind;
    this.name = name;
    this.handler = handler;
    this.include = include;
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.debounce = debounce;
    this.throttle = throttle;
  }
}
class Handler extends CustomType {
  constructor(prevent_default, stop_propagation, message) {
    super();
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.message = message;
  }
}
var attribute_kind = 0;
var property_kind = 1;
var event_kind = 2;
var never_kind = 0;
var always_kind = 2;
function attribute(name, value) {
  return new Attribute(attribute_kind, name, value);
}
function property(name, value) {
  return new Property(property_kind, name, value);
}
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes instanceof Empty) {
      return merged;
    } else {
      let $ = attributes.head;
      if ($ instanceof Attribute) {
        let $1 = $.name;
        if ($1 === "") {
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = merged;
        } else if ($1 === "class") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "class") {
                  let kind = $.kind;
                  let class1 = $2;
                  let rest = $3.tail;
                  let class2 = $4.value;
                  let value = class1 + " " + class2;
                  let attribute$1 = new Attribute(kind, "class", value);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else if ($1 === "style") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "style") {
                  let kind = $.kind;
                  let style1 = $2;
                  let rest = $3.tail;
                  let style2 = $4.value;
                  let value = style1 + ";" + style2;
                  let attribute$1 = new Attribute(kind, "style", value);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else {
          let attribute$1 = $;
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = prepend(attribute$1, merged);
        }
      } else {
        let attribute$1 = $;
        let rest = attributes.tail;
        loop$attributes = rest;
        loop$merged = prepend(attribute$1, merged);
      }
    }
  }
}
function prepare(attributes) {
  if (attributes instanceof Empty) {
    return attributes;
  } else {
    let $ = attributes.tail;
    if ($ instanceof Empty) {
      return attributes;
    } else {
      let _pipe = attributes;
      let _pipe$1 = sort(_pipe, (a, b) => {
        return compare3(b, a);
      });
      return merge(_pipe$1, empty_list);
    }
  }
}

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name, value) {
  return attribute(name, value);
}
function property2(name, value) {
  return property(name, value);
}
function boolean_attribute(name, value) {
  if (value) {
    return attribute2(name, "");
  } else {
    return property2(name, bool(false));
  }
}
function class$(name) {
  return attribute2("class", name);
}
function id(value) {
  return attribute2("id", value);
}
function style(property3, value) {
  if (property3 === "") {
    return class$("");
  } else if (value === "") {
    return class$("");
  } else {
    return attribute2("style", property3 + ":" + value + ";");
  }
}
function do_styles(loop$properties, loop$styles) {
  while (true) {
    let properties = loop$properties;
    let styles = loop$styles;
    if (properties instanceof Empty) {
      return styles;
    } else {
      let $ = properties.head[0];
      if ($ === "") {
        let rest = properties.tail;
        loop$properties = rest;
        loop$styles = styles;
      } else {
        let $1 = properties.head[1];
        if ($1 === "") {
          let rest = properties.tail;
          loop$properties = rest;
          loop$styles = styles;
        } else {
          let rest = properties.tail;
          let name$1 = $;
          let value$1 = $1;
          loop$properties = rest;
          loop$styles = styles + name$1 + ":" + value$1 + ";";
        }
      }
    }
  }
}
function styles(properties) {
  return attribute2("style", do_styles(properties, ""));
}
function title(text) {
  return attribute2("title", text);
}
function href(url) {
  return attribute2("href", url);
}
function target(value) {
  return attribute2("target", value);
}
function alt(text) {
  return attribute2("alt", text);
}
function src(url) {
  return attribute2("src", url);
}
function checked(is_checked) {
  return boolean_attribute("checked", is_checked);
}
function disabled(is_disabled) {
  return boolean_attribute("disabled", is_disabled);
}
function type_(control_type) {
  return attribute2("type", control_type);
}

// build/dev/javascript/lustre/lustre/effect.mjs
class Effect extends CustomType {
  constructor(synchronous, before_paint, after_paint) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint;
    this.after_paint = after_paint;
  }
}

class Actions extends CustomType {
  constructor(dispatch, emit, select, root, provide, subscribe, unsubscribe) {
    super();
    this.dispatch = dispatch;
    this.emit = emit;
    this.select = select;
    this.root = root;
    this.provide = provide;
    this.subscribe = subscribe;
    this.unsubscribe = unsubscribe;
  }
}
var empty = /* @__PURE__ */ new Effect(empty_list, empty_list, empty_list);
function none() {
  return empty;
}
function from2(effect) {
  let task = (actions) => {
    let dispatch = actions.dispatch;
    return effect(dispatch);
  };
  return new Effect(singleton_list(task), empty.before_paint, empty.after_paint);
}
function batch(effects) {
  return fold2(effects, empty, (acc, eff) => {
    return new Effect(fold2(eff.synchronous, acc.synchronous, prepend2), fold2(eff.before_paint, acc.before_paint, prepend2), fold2(eff.after_paint, acc.after_paint, prepend2));
  });
}
function perform(effect, dispatch, emit, select, root, provide, subscribe, unsubscribe) {
  let actions = new Actions(dispatch, emit, select, root, provide, subscribe, unsubscribe);
  return each(effect.synchronous, (run2) => {
    return run2(actions);
  });
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty2() {
  return null;
}
function get2(map5, key) {
  return map5?.get(key);
}
function get_or_compute(map5, key, compute) {
  return map5?.get(key) ?? compute();
}
function has_key(map5, key) {
  return map5 && map5.has(key);
}
function insert2(map5, key, value) {
  map5 ??= new Map;
  map5.set(key, value);
  return map5;
}
function remove(map5, key) {
  map5?.delete(key);
  return map5;
}

// build/dev/javascript/lustre/lustre/internals/ref.ffi.mjs
function sameValueZero(x, y) {
  if (typeof x === "number" && typeof y === "number") {
    return x === y || x !== x && y !== y;
  }
  return x === y;
}

// build/dev/javascript/lustre/lustre/internals/ref.mjs
function equal_lists(loop$xs, loop$ys) {
  while (true) {
    let xs = loop$xs;
    let ys = loop$ys;
    if (xs instanceof Empty) {
      if (ys instanceof Empty) {
        return true;
      } else {
        return false;
      }
    } else if (ys instanceof Empty) {
      return false;
    } else {
      let x = xs.head;
      let xs$1 = xs.tail;
      let y = ys.head;
      let ys$1 = ys.tail;
      let $ = sameValueZero(x, y);
      if ($) {
        loop$xs = xs$1;
        loop$ys = ys$1;
      } else {
        return $;
      }
    }
  }
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
class Fragment extends CustomType {
  constructor(kind, key, children, keyed_children) {
    super();
    this.kind = kind;
    this.key = key;
    this.children = children;
    this.keyed_children = keyed_children;
  }
}
class Element extends CustomType {
  constructor(kind, key, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
}
class Text extends CustomType {
  constructor(kind, key, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.content = content;
  }
}
class UnsafeInnerHtml extends CustomType {
  constructor(kind, key, namespace, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
}
class Map2 extends CustomType {
  constructor(kind, key, mapper, child) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.child = child;
  }
}
class Memo extends CustomType {
  constructor(kind, key, dependencies, view) {
    super();
    this.kind = kind;
    this.key = key;
    this.dependencies = dependencies;
    this.view = view;
  }
}
var fragment_kind = 0;
var element_kind = 1;
var text_kind = 2;
var unsafe_inner_html_kind = 3;
var map_kind = 4;
var memo_kind = 5;
function fragment(key, children, keyed_children) {
  return new Fragment(fragment_kind, key, children, keyed_children);
}
function element(key, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(element_kind, key, namespace, tag, prepare(attributes), children, keyed_children, self_closing, void$);
}
function is_void_html_element(tag, namespace) {
  if (namespace === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function text(key, content) {
  return new Text(text_kind, key, content);
}
function unsafe_inner_html(key, namespace, tag, attributes, inner_html) {
  return new UnsafeInnerHtml(unsafe_inner_html_kind, key, namespace, tag, prepare(attributes), inner_html);
}
function map5(element2, mapper) {
  if (element2 instanceof Map2) {
    let child_mapper = element2.mapper;
    return new Map2(map_kind, element2.key, (handler) => {
      return identity2(mapper)(child_mapper(handler));
    }, identity2(element2.child));
  } else {
    return new Map2(map_kind, element2.key, identity2(mapper), identity2(element2));
  }
}
function memo(key, dependencies, view) {
  return new Memo(memo_kind, key, dependencies, view);
}
function to_keyed(key, node) {
  if (node instanceof Fragment) {
    return new Fragment(node.kind, key, node.children, node.keyed_children);
  } else if (node instanceof Element) {
    return new Element(node.kind, key, node.namespace, node.tag, node.attributes, node.children, node.keyed_children, node.self_closing, node.void);
  } else if (node instanceof Text) {
    return new Text(node.kind, key, node.content);
  } else if (node instanceof UnsafeInnerHtml) {
    return new UnsafeInnerHtml(node.kind, key, node.namespace, node.tag, node.attributes, node.inner_html);
  } else if (node instanceof Map2) {
    let child = node.child;
    return new Map2(node.kind, key, node.mapper, to_keyed(key, child));
  } else {
    let view = node.view;
    return new Memo(node.kind, key, node.dependencies, () => {
      return to_keyed(key, view());
    });
  }
}

// build/dev/javascript/lustre/lustre/element.mjs
class Html extends CustomType {
}
var DocumentType$Html$const = new Html;

class HeadOnly extends CustomType {
}
var DocumentType$HeadOnly$const = new HeadOnly;

class BodyOnly extends CustomType {
}
var DocumentType$BodyOnly$const = new BodyOnly;

class HeadAndBody extends CustomType {
}
var DocumentType$HeadAndBody$const = new HeadAndBody;

class Other extends CustomType {
}
var DocumentType$Other$const = new Other;
function element2(tag, attributes, children) {
  return element("", "", tag, attributes, children, empty2(), false, is_void_html_element(tag, ""));
}
function text2(content) {
  return text("", content);
}
function none2() {
  return text("", "");
}
function fragment2(children) {
  return fragment("", children, empty2());
}
function unsafe_raw_html(namespace, tag, attributes, inner_html) {
  return unsafe_inner_html("", namespace, tag, attributes, inner_html);
}
function memo2(dependencies, view) {
  return memo("", dependencies, view);
}
function ref(value) {
  return identity2(value);
}
function map6(element3, f) {
  return map5(element3, f);
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text3(content) {
  return text2(content);
}
function h1(attrs, children) {
  return element2("h1", attrs, children);
}
function h2(attrs, children) {
  return element2("h2", attrs, children);
}
function h3(attrs, children) {
  return element2("h3", attrs, children);
}
function h4(attrs, children) {
  return element2("h4", attrs, children);
}
function h5(attrs, children) {
  return element2("h5", attrs, children);
}
function h6(attrs, children) {
  return element2("h6", attrs, children);
}
function section(attrs, children) {
  return element2("section", attrs, children);
}
function blockquote(attrs, children) {
  return element2("blockquote", attrs, children);
}
function div(attrs, children) {
  return element2("div", attrs, children);
}
function hr(attrs) {
  return element2("hr", attrs, empty_list);
}
function li(attrs, children) {
  return element2("li", attrs, children);
}
function ol(attrs, children) {
  return element2("ol", attrs, children);
}
function p(attrs, children) {
  return element2("p", attrs, children);
}
function pre(attrs, children) {
  return element2("pre", attrs, children);
}
function ul(attrs, children) {
  return element2("ul", attrs, children);
}
function a(attrs, children) {
  return element2("a", attrs, children);
}
function br(attrs) {
  return element2("br", attrs, empty_list);
}
function code(attrs, children) {
  return element2("code", attrs, children);
}
function em(attrs, children) {
  return element2("em", attrs, children);
}
function mark(attrs, children) {
  return element2("mark", attrs, children);
}
function span(attrs, children) {
  return element2("span", attrs, children);
}
function strong(attrs, children) {
  return element2("strong", attrs, children);
}
function sup(attrs, children) {
  return element2("sup", attrs, children);
}
function img(attrs) {
  return element2("img", attrs, empty_list);
}
function del(attrs, children) {
  return element2("del", attrs, children);
}
function table(attrs, children) {
  return element2("table", attrs, children);
}
function tbody(attrs, children) {
  return element2("tbody", attrs, children);
}
function td(attrs, children) {
  return element2("td", attrs, children);
}
function th(attrs, children) {
  return element2("th", attrs, children);
}
function thead(attrs, children) {
  return element2("thead", attrs, children);
}
function tr(attrs, children) {
  return element2("tr", attrs, children);
}
function input(attrs) {
  return element2("input", attrs, empty_list);
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
class Patch extends CustomType {
  constructor(index3, path, removed, changes, children) {
    super();
    this.index = index3;
    this.path = path;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
}
class ReplaceText extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
}
class ReplaceInnerHtml extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
}
class Update extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
}
class Move extends CustomType {
  constructor(kind, key, before) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
  }
}
class Replace extends CustomType {
  constructor(kind, index3, with$) {
    super();
    this.kind = kind;
    this.index = index3;
    this.with = with$;
  }
}
class Remove extends CustomType {
  constructor(kind, index3) {
    super();
    this.kind = kind;
    this.index = index3;
  }
}
class Insert extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
}
var replace_text_kind = 0;
var replace_inner_html_kind = 1;
var update_kind = 2;
var move_kind = 3;
var remove_kind = 4;
var replace_kind = 5;
var insert_kind = 6;
function new$3(index3, removed, changes, children) {
  return new Patch(index3, empty_list, removed, changes, children);
}
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
function update(added, removed) {
  return new Update(update_kind, added, removed);
}
function move(key, before) {
  return new Move(move_kind, key, before);
}
function remove2(index3) {
  return new Remove(remove_kind, index3);
}
function replace2(index3, with$) {
  return new Replace(replace_kind, index3, with$);
}
function insert3(children, before) {
  return new Insert(insert_kind, children, before);
}
function add_parent(child, index3) {
  return new Patch(index3, prepend(child.index, child.path), child.removed, child.changes, child.children);
}

// build/dev/javascript/lustre/lustre/runtime/transport.mjs
class Mount extends CustomType {
  constructor(kind, open_shadow_root, will_adopt_styles, observed_attributes, observed_properties, requested_contexts, provided_contexts, vdom, memos) {
    super();
    this.kind = kind;
    this.open_shadow_root = open_shadow_root;
    this.will_adopt_styles = will_adopt_styles;
    this.observed_attributes = observed_attributes;
    this.observed_properties = observed_properties;
    this.requested_contexts = requested_contexts;
    this.provided_contexts = provided_contexts;
    this.vdom = vdom;
    this.memos = memos;
  }
}
class Reconcile extends CustomType {
  constructor(kind, patch, memos) {
    super();
    this.kind = kind;
    this.patch = patch;
    this.memos = memos;
  }
}
class Emit extends CustomType {
  constructor(kind, name, data) {
    super();
    this.kind = kind;
    this.name = name;
    this.data = data;
  }
}
class Provide extends CustomType {
  constructor(kind, key, value) {
    super();
    this.kind = kind;
    this.key = key;
    this.value = value;
  }
}
class Subscribe extends CustomType {
  constructor(kind, key) {
    super();
    this.kind = kind;
    this.key = key;
  }
}
class Unsubscribe extends CustomType {
  constructor(kind, key) {
    super();
    this.kind = kind;
    this.key = key;
  }
}
class Batch extends CustomType {
  constructor(kind, messages) {
    super();
    this.kind = kind;
    this.messages = messages;
  }
}
var ServerMessage$isBatch = (value) => value instanceof Batch;
class AttributeChanged extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
}
var ServerMessage$isAttributeChanged = (value) => value instanceof AttributeChanged;
class PropertyChanged extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
}
var ServerMessage$isPropertyChanged = (value) => value instanceof PropertyChanged;
class EventFired extends CustomType {
  constructor(kind, path, name, event) {
    super();
    this.kind = kind;
    this.path = path;
    this.name = name;
    this.event = event;
  }
}
var ServerMessage$isEventFired = (value) => value instanceof EventFired;
class ContextProvided extends CustomType {
  constructor(kind, key, value) {
    super();
    this.kind = kind;
    this.key = key;
    this.value = value;
  }
}
var ServerMessage$isContextProvided = (value) => value instanceof ContextProvided;
var mount_kind = 0;
var reconcile_kind = 1;
var emit_kind = 2;
var provide_kind = 3;
var subscribe_kind = 4;
var unsubscribe_kind = 5;
function mount(open_shadow_root, will_adopt_styles, observed_attributes, observed_properties, requested_contexts, provided_contexts, vdom, memos) {
  return new Mount(mount_kind, open_shadow_root, will_adopt_styles, observed_attributes, observed_properties, requested_contexts, provided_contexts, vdom, memos);
}
function reconcile(patch, memos) {
  return new Reconcile(reconcile_kind, patch, memos);
}
function emit(name, data) {
  return new Emit(emit_kind, name, data);
}
function provide(key, value) {
  return new Provide(provide_kind, key, value);
}
function subscribe(key) {
  return new Subscribe(subscribe_kind, key);
}
function unsubscribe(key) {
  return new Unsubscribe(unsubscribe_kind, key);
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
class Root extends CustomType {
}
var Path$Root$const = new Root;

class Key extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
}

class Index extends CustomType {
  constructor(index3, parent) {
    super();
    this.index = index3;
    this.parent = parent;
  }
}

class Subtree extends CustomType {
  constructor(parent) {
    super();
    this.parent = parent;
  }
}
var separator_subtree = "\r";
var separator_element = "\t";
var separator_event = `
`;
var root = Path$Root$const;
function finish_to_string(acc) {
  if (acc instanceof Empty) {
    return "";
  } else {
    let segments = acc.tail;
    return concat2(segments);
  }
}
function do_to_string(loop$full, loop$path, loop$acc) {
  while (true) {
    let full = loop$full;
    let path = loop$path;
    let acc = loop$acc;
    if (path instanceof Root) {
      return finish_to_string(acc);
    } else if (path instanceof Key) {
      let key = path.key;
      let parent = path.parent;
      loop$full = full;
      loop$path = parent;
      loop$acc = prepend(separator_element, prepend(key, acc));
    } else if (path instanceof Index) {
      let index3 = path.index;
      let parent = path.parent;
      let acc$1 = prepend(separator_element, prepend(to_string(index3), acc));
      loop$full = full;
      loop$path = parent;
      loop$acc = acc$1;
    } else if (!full) {
      return finish_to_string(acc);
    } else {
      let parent = path.parent;
      if (acc instanceof Empty) {
        loop$full = full;
        loop$path = parent;
        loop$acc = acc;
      } else {
        let acc$1 = acc.tail;
        loop$full = full;
        loop$path = parent;
        loop$acc = prepend(separator_subtree, acc$1);
      }
    }
  }
}
function to_string3(path) {
  return do_to_string(true, path, empty_list);
}
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path = loop$path;
    let candidates = loop$candidates;
    if (candidates instanceof Empty) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path, candidate);
      if ($) {
        return $;
      } else {
        loop$path = path;
        loop$candidates = rest;
      }
    }
  }
}
function matches(path, candidates) {
  if (candidates instanceof Empty) {
    return false;
  } else {
    return do_matches(to_string3(path), candidates);
  }
}
function split_subtree_path(path) {
  return split2(path, separator_subtree);
}
function add2(parent, index3, key) {
  if (key === "") {
    return new Index(index3, parent);
  } else {
    return new Key(key, parent);
  }
}
function subtree(path) {
  return new Subtree(path);
}
function event(path, event2) {
  return do_to_string(false, path, prepend(separator_event, prepend(event2, empty_list)));
}
function child(path) {
  return do_to_string(false, path, empty_list);
}

// build/dev/javascript/lustre/lustre/vdom/cache.mjs
class Cache extends CustomType {
  constructor(events, vdoms, old_vdoms, dispatched_paths, next_dispatched_paths) {
    super();
    this.events = events;
    this.vdoms = vdoms;
    this.old_vdoms = old_vdoms;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
}

class Events extends CustomType {
  constructor(handlers, children) {
    super();
    this.handlers = handlers;
    this.children = children;
  }
}

class Child extends CustomType {
  constructor(mapper, events) {
    super();
    this.mapper = mapper;
    this.events = events;
  }
}

class AddedChildren extends CustomType {
  constructor(handlers, children, vdoms) {
    super();
    this.handlers = handlers;
    this.children = children;
    this.vdoms = vdoms;
  }
}

class DecodedEvent extends CustomType {
  constructor(path, handler) {
    super();
    this.path = path;
    this.handler = handler;
  }
}

class DispatchedEvent extends CustomType {
  constructor(path) {
    super();
    this.path = path;
  }
}
function compose_mapper(mapper, child_mapper) {
  return (message) => {
    return mapper(child_mapper(message));
  };
}
function new_events() {
  return new Events(empty2(), empty2());
}
function new$4() {
  return new Cache(new_events(), empty2(), empty2(), empty_list, empty_list);
}
function do_add_event(handlers, path, name, handler) {
  return insert2(handlers, event(path, name), handler);
}
function add_attributes(handlers, path, attributes) {
  return fold2(attributes, handlers, (events, attribute3) => {
    if (attribute3 instanceof Event2) {
      let name = attribute3.name;
      let handler = attribute3.handler;
      return do_add_event(events, path, name, handler);
    } else {
      return events;
    }
  });
}
function do_add_children(loop$handlers, loop$children, loop$vdoms, loop$parent, loop$child_index, loop$nodes) {
  while (true) {
    let handlers = loop$handlers;
    let children = loop$children;
    let vdoms = loop$vdoms;
    let parent = loop$parent;
    let child_index = loop$child_index;
    let nodes = loop$nodes;
    let next = child_index + 1;
    if (nodes instanceof Empty) {
      return new AddedChildren(handlers, children, vdoms);
    } else {
      let $ = nodes.head;
      if ($ instanceof Fragment) {
        let rest = nodes.tail;
        let key = $.key;
        let nodes$1 = $.children;
        let path = add2(parent, child_index, key);
        let $1 = do_add_children(handlers, children, vdoms, path, 0, nodes$1);
        let handlers$1 = $1.handlers;
        let children$1 = $1.children;
        let vdoms$1 = $1.vdoms;
        loop$handlers = handlers$1;
        loop$children = children$1;
        loop$vdoms = vdoms$1;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else if ($ instanceof Element) {
        let rest = nodes.tail;
        let key = $.key;
        let attributes = $.attributes;
        let nodes$1 = $.children;
        let path = add2(parent, child_index, key);
        let handlers$1 = add_attributes(handlers, path, attributes);
        let $1 = do_add_children(handlers$1, children, vdoms, path, 0, nodes$1);
        let handlers$2 = $1.handlers;
        let children$1 = $1.children;
        let vdoms$1 = $1.vdoms;
        loop$handlers = handlers$2;
        loop$children = children$1;
        loop$vdoms = vdoms$1;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else if ($ instanceof Text) {
        let rest = nodes.tail;
        loop$handlers = handlers;
        loop$children = children;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else if ($ instanceof UnsafeInnerHtml) {
        let rest = nodes.tail;
        let key = $.key;
        let attributes = $.attributes;
        let path = add2(parent, child_index, key);
        let handlers$1 = add_attributes(handlers, path, attributes);
        loop$handlers = handlers$1;
        loop$children = children;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else if ($ instanceof Map2) {
        let rest = nodes.tail;
        let key = $.key;
        let mapper = $.mapper;
        let child2 = $.child;
        let path = add2(parent, child_index, key);
        let added = do_add_children(empty2(), empty2(), vdoms, subtree(path), 0, singleton_list(child2));
        let vdoms$1 = added.vdoms;
        let child_events = new Events(added.handlers, added.children);
        let child$1 = new Child(mapper, child_events);
        let children$1 = insert2(children, child(path), child$1);
        loop$handlers = handlers;
        loop$children = children$1;
        loop$vdoms = vdoms$1;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else {
        let rest = nodes.tail;
        let view = $.view;
        let child_node = view();
        let vdoms$1 = insert2(vdoms, view, child_node);
        let next$1 = child_index;
        let rest$1 = prepend(child_node, rest);
        loop$handlers = handlers;
        loop$children = children;
        loop$vdoms = vdoms$1;
        loop$parent = parent;
        loop$child_index = next$1;
        loop$nodes = rest$1;
      }
    }
  }
}
function add_children(cache, events, path, child_index, nodes) {
  let vdoms = cache.vdoms;
  let handlers = events.handlers;
  let children = events.children;
  let $ = do_add_children(handlers, children, vdoms, path, child_index, nodes);
  let handlers$1 = $.handlers;
  let children$1 = $.children;
  let vdoms$1 = $.vdoms;
  return [
    new Cache(cache.events, vdoms$1, cache.old_vdoms, cache.dispatched_paths, cache.next_dispatched_paths),
    new Events(handlers$1, children$1)
  ];
}
function add_child(cache, events, parent, index3, child2) {
  let children = singleton_list(child2);
  return add_children(cache, events, parent, index3, children);
}
function from_node(root2) {
  let cache = new$4();
  let $ = add_child(cache, cache.events, root, 0, root2);
  let cache$1 = $[0];
  let events$1 = $[1];
  return new Cache(events$1, cache$1.vdoms, cache$1.old_vdoms, cache$1.dispatched_paths, cache$1.next_dispatched_paths);
}
function tick(cache) {
  return new Cache(cache.events, empty2(), cache.vdoms, cache.next_dispatched_paths, empty_list);
}
function events(cache) {
  return cache.events;
}
function update_events(cache, events2) {
  return new Cache(events2, cache.vdoms, cache.old_vdoms, cache.dispatched_paths, cache.next_dispatched_paths);
}
function memos(cache) {
  return cache.vdoms;
}
function get_old_memo(cache, old, new$5) {
  return get_or_compute(cache.old_vdoms, old, new$5);
}
function keep_memo(cache, old, new$5) {
  let node = get_or_compute(cache.old_vdoms, old, new$5);
  let vdoms = insert2(cache.vdoms, new$5, node);
  return new Cache(cache.events, vdoms, cache.old_vdoms, cache.dispatched_paths, cache.next_dispatched_paths);
}
function add_memo(cache, new$5, node) {
  let vdoms = insert2(cache.vdoms, new$5, node);
  return new Cache(cache.events, vdoms, cache.old_vdoms, cache.dispatched_paths, cache.next_dispatched_paths);
}
function get_subtree(events2, path, old_mapper) {
  let child2 = get_or_compute(events2.children, path, () => {
    return new Child(old_mapper, new_events());
  });
  return child2.events;
}
function update_subtree(parent, path, mapper, events2) {
  let new_child = new Child(mapper, events2);
  let children = insert2(parent.children, path, new_child);
  return new Events(parent.handlers, children);
}
function add_event(events2, path, name, handler) {
  let handlers = do_add_event(events2.handlers, path, name, handler);
  return new Events(handlers, events2.children);
}
function do_remove_event(handlers, path, name) {
  return remove(handlers, event(path, name));
}
function remove_event(events2, path, name) {
  let handlers = do_remove_event(events2.handlers, path, name);
  return new Events(handlers, events2.children);
}
function remove_attributes(handlers, path, attributes) {
  return fold2(attributes, handlers, (events2, attribute3) => {
    if (attribute3 instanceof Event2) {
      let name = attribute3.name;
      return do_remove_event(events2, path, name);
    } else {
      return events2;
    }
  });
}
function do_remove_children(loop$handlers, loop$children, loop$vdoms, loop$parent, loop$index, loop$nodes) {
  while (true) {
    let handlers = loop$handlers;
    let children = loop$children;
    let vdoms = loop$vdoms;
    let parent = loop$parent;
    let index3 = loop$index;
    let nodes = loop$nodes;
    let next = index3 + 1;
    if (nodes instanceof Empty) {
      return new Events(handlers, children);
    } else {
      let $ = nodes.head;
      if ($ instanceof Fragment) {
        let rest = nodes.tail;
        let key = $.key;
        let nodes$1 = $.children;
        let path = add2(parent, index3, key);
        let $1 = do_remove_children(handlers, children, vdoms, path, 0, nodes$1);
        let handlers$1 = $1.handlers;
        let children$1 = $1.children;
        loop$handlers = handlers$1;
        loop$children = children$1;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else if ($ instanceof Element) {
        let rest = nodes.tail;
        let key = $.key;
        let attributes = $.attributes;
        let nodes$1 = $.children;
        let path = add2(parent, index3, key);
        let handlers$1 = remove_attributes(handlers, path, attributes);
        let $1 = do_remove_children(handlers$1, children, vdoms, path, 0, nodes$1);
        let handlers$2 = $1.handlers;
        let children$1 = $1.children;
        loop$handlers = handlers$2;
        loop$children = children$1;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else if ($ instanceof Text) {
        let rest = nodes.tail;
        loop$handlers = handlers;
        loop$children = children;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else if ($ instanceof UnsafeInnerHtml) {
        let rest = nodes.tail;
        let key = $.key;
        let attributes = $.attributes;
        let path = add2(parent, index3, key);
        let handlers$1 = remove_attributes(handlers, path, attributes);
        loop$handlers = handlers$1;
        loop$children = children;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else if ($ instanceof Map2) {
        let rest = nodes.tail;
        let key = $.key;
        let path = add2(parent, index3, key);
        let children$1 = remove(children, child(path));
        loop$handlers = handlers;
        loop$children = children$1;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else {
        let rest = nodes.tail;
        let view = $.view;
        let $1 = has_key(vdoms, view);
        if ($1) {
          let child2 = get2(vdoms, view);
          let nodes$1 = prepend(child2, rest);
          loop$handlers = handlers;
          loop$children = children;
          loop$vdoms = vdoms;
          loop$parent = parent;
          loop$index = index3;
          loop$nodes = nodes$1;
        } else {
          loop$handlers = handlers;
          loop$children = children;
          loop$vdoms = vdoms;
          loop$parent = parent;
          loop$index = next;
          loop$nodes = rest;
        }
      }
    }
  }
}
function remove_child(cache, events2, parent, child_index, child2) {
  return do_remove_children(events2.handlers, events2.children, cache.old_vdoms, parent, child_index, singleton_list(child2));
}
function replace_child(cache, events2, parent, child_index, prev, next) {
  let events$1 = remove_child(cache, events2, parent, child_index, prev);
  return add_child(cache, events$1, parent, child_index, next);
}
function get_handler(loop$events, loop$path, loop$mapper) {
  while (true) {
    let events2 = loop$events;
    let path = loop$path;
    let mapper = loop$mapper;
    if (path instanceof Empty) {
      return error_nil;
    } else {
      let $ = path.tail;
      if ($ instanceof Empty) {
        let key = path.head;
        let $1 = has_key(events2.handlers, key);
        if ($1) {
          let handler = get2(events2.handlers, key);
          return new Ok(map3(handler, (handler2) => {
            return new Handler(handler2.prevent_default, handler2.stop_propagation, identity2(mapper)(handler2.message));
          }));
        } else {
          return error_nil;
        }
      } else {
        let key = path.head;
        let path$1 = $;
        let $1 = has_key(events2.children, key);
        if ($1) {
          let child2 = get2(events2.children, key);
          let mapper$1 = compose_mapper(mapper, child2.mapper);
          loop$events = child2.events;
          loop$path = path$1;
          loop$mapper = mapper$1;
        } else {
          return error_nil;
        }
      }
    }
  }
}
function decode2(cache, path, name, event2) {
  let parts = split_subtree_path(path + separator_event + name);
  let $ = get_handler(cache.events, parts, identity2);
  if ($ instanceof Ok) {
    let handler = $[0];
    let $1 = run(event2, handler);
    if ($1 instanceof Ok) {
      let handler$1 = $1[0];
      return new DecodedEvent(path, handler$1);
    } else {
      return new DispatchedEvent(path);
    }
  } else {
    return new DispatchedEvent(path);
  }
}
function dispatch(cache, event2) {
  let next_dispatched_paths = prepend(event2.path, cache.next_dispatched_paths);
  let cache$1 = new Cache(cache.events, cache.vdoms, cache.old_vdoms, cache.dispatched_paths, next_dispatched_paths);
  if (event2 instanceof DecodedEvent) {
    let handler = event2.handler;
    return [cache$1, new Ok(handler)];
  } else {
    return [cache$1, error_nil];
  }
}
function handle(cache, path, name, event2) {
  let _pipe = decode2(cache, path, name, event2);
  return ((_capture) => {
    return dispatch(cache, _capture);
  })(_pipe);
}
function has_dispatched_events(cache, path) {
  return matches(path, cache.dispatched_paths);
}

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
class ClientDispatchedMessage extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
}
var Message$isClientDispatchedMessage = (value) => value instanceof ClientDispatchedMessage;
class ClientRegisteredCallback extends CustomType {
  constructor(callback) {
    super();
    this.callback = callback;
  }
}
var Message$isClientRegisteredCallback = (value) => value instanceof ClientRegisteredCallback;
class ClientDeregisteredCallback extends CustomType {
  constructor(callback) {
    super();
    this.callback = callback;
  }
}
var Message$isClientDeregisteredCallback = (value) => value instanceof ClientDeregisteredCallback;
class EffectDispatchedMessage extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
}
var Message$EffectDispatchedMessage = (message) => new EffectDispatchedMessage(message);
var Message$isEffectDispatchedMessage = (value) => value instanceof EffectDispatchedMessage;
class EffectEmitEvent extends CustomType {
  constructor(name, data) {
    super();
    this.name = name;
    this.data = data;
  }
}
var Message$EffectEmitEvent = (name, data) => new EffectEmitEvent(name, data);
var Message$isEffectEmitEvent = (value) => value instanceof EffectEmitEvent;
class EffectProvidedValue extends CustomType {
  constructor(key, value) {
    super();
    this.key = key;
    this.value = value;
  }
}
var Message$EffectProvidedValue = (key, value) => new EffectProvidedValue(key, value);
var Message$isEffectProvidedValue = (value) => value instanceof EffectProvidedValue;
class EffectRequestedContextSubscription extends CustomType {
  constructor(key, decoder) {
    super();
    this.key = key;
    this.decoder = decoder;
  }
}
var Message$EffectRequestedContextSubscription = (key, decoder) => new EffectRequestedContextSubscription(key, decoder);
var Message$isEffectRequestedContextSubscription = (value) => value instanceof EffectRequestedContextSubscription;
class EffectRemovedContextSubscription extends CustomType {
  constructor(key) {
    super();
    this.key = key;
  }
}
var Message$EffectRemovedContextSubscription = (key) => new EffectRemovedContextSubscription(key);
var Message$isEffectRemovedContextSubscription = (value) => value instanceof EffectRemovedContextSubscription;
class SystemRequestedShutdown extends CustomType {
}
var Message$SystemRequestedShutdown$const = new SystemRequestedShutdown;
var Message$isSystemRequestedShutdown = (value) => value instanceof SystemRequestedShutdown;

// build/dev/javascript/lustre/lustre/runtime/app.mjs
class App extends CustomType {
  constructor(name, init, update2, view, config) {
    super();
    this.name = name;
    this.init = init;
    this.update = update2;
    this.view = view;
    this.config = config;
  }
}
class Config2 extends CustomType {
  constructor(open_shadow_root, adopt_styles, delegates_focus, attributes, properties, contexts, is_form_associated, on_form_autofill, on_form_reset, on_form_restore, on_form_disabled, on_connect, on_adopt, on_disconnect) {
    super();
    this.open_shadow_root = open_shadow_root;
    this.adopt_styles = adopt_styles;
    this.delegates_focus = delegates_focus;
    this.attributes = attributes;
    this.properties = properties;
    this.contexts = contexts;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
    this.on_form_disabled = on_form_disabled;
    this.on_connect = on_connect;
    this.on_adopt = on_adopt;
    this.on_disconnect = on_disconnect;
  }
}
class Option extends CustomType {
  constructor(apply) {
    super();
    this.apply = apply;
  }
}
var default_config = /* @__PURE__ */ new Config2(true, true, false, empty_list, empty_list, empty_list, false, Option$None$const, Option$None$const, Option$None$const, Option$None$const, Option$None$const, Option$None$const, Option$None$const);
function configure(options) {
  return fold2(options, default_config, (config, option) => {
    return option.apply(config);
  });
}

// build/dev/javascript/lustre/lustre/internals/equals.ffi.mjs
var isEqual2 = (a2, b) => {
  if (a2 === b) {
    return true;
  }
  if (a2 == null || b == null) {
    return false;
  }
  const type = typeof a2;
  if (type !== typeof b) {
    return false;
  }
  if (type !== "object") {
    return false;
  }
  const ctor = a2.constructor;
  if (ctor !== b.constructor) {
    return false;
  }
  if (Array.isArray(a2)) {
    return areArraysEqual(a2, b);
  }
  return areObjectsEqual(a2, b);
};
var areArraysEqual = (a2, b) => {
  let index3 = a2.length;
  if (index3 !== b.length) {
    return false;
  }
  while (index3--) {
    if (!isEqual2(a2[index3], b[index3])) {
      return false;
    }
  }
  return true;
};
var areObjectsEqual = (a2, b) => {
  const properties = Object.keys(a2);
  let index3 = properties.length;
  if (Object.keys(b).length !== index3) {
    return false;
  }
  while (index3--) {
    const property3 = properties[index3];
    if (!Object.hasOwn(b, property3)) {
      return false;
    }
    if (!isEqual2(a2[property3], b[property3])) {
      return false;
    }
  }
  return true;
};

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
class Diff extends CustomType {
  constructor(patch, cache) {
    super();
    this.patch = patch;
    this.cache = cache;
  }
}
class PartialDiff extends CustomType {
  constructor(patch, cache, events2) {
    super();
    this.patch = patch;
    this.cache = cache;
    this.events = events2;
  }
}

class AttributeChange extends CustomType {
  constructor(added, removed, events2) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events2;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path = loop$path;
    let events2 = loop$events;
    let old = loop$old;
    let new$5 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (old instanceof Empty) {
      if (new$5 instanceof Empty) {
        return new AttributeChange(added, removed, events2);
      } else {
        let $ = new$5.head;
        if ($ instanceof Event2) {
          let next = $;
          let new$1 = new$5.tail;
          let name = $.name;
          let handler = $.handler;
          let events$1 = add_event(events2, path, name, handler);
          let added$1 = prepend(next, added);
          loop$controlled = controlled;
          loop$path = path;
          loop$events = events$1;
          loop$old = old;
          loop$new = new$1;
          loop$added = added$1;
          loop$removed = removed;
        } else {
          let next = $;
          let new$1 = new$5.tail;
          let added$1 = prepend(next, added);
          loop$controlled = controlled;
          loop$path = path;
          loop$events = events2;
          loop$old = old;
          loop$new = new$1;
          loop$added = added$1;
          loop$removed = removed;
        }
      }
    } else if (new$5 instanceof Empty) {
      let $ = old.head;
      if ($ instanceof Event2) {
        let prev = $;
        let old$1 = old.tail;
        let name = $.name;
        let events$1 = remove_event(events2, path, name);
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$events = events$1;
        loop$old = old$1;
        loop$new = new$5;
        loop$added = added;
        loop$removed = removed$1;
      } else {
        let prev = $;
        let old$1 = old.tail;
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$events = events2;
        loop$old = old$1;
        loop$new = new$5;
        loop$added = added;
        loop$removed = removed$1;
      }
    } else {
      let prev = old.head;
      let remaining_old = old.tail;
      let next = new$5.head;
      let remaining_new = new$5.tail;
      let $ = compare3(prev, next);
      if ($ instanceof Lt) {
        if (prev instanceof Event2) {
          let name = prev.name;
          loop$controlled = controlled;
          loop$path = path;
          loop$events = remove_event(events2, path, name);
          loop$old = remaining_old;
          loop$new = new$5;
          loop$added = added;
          loop$removed = prepend(prev, removed);
        } else {
          loop$controlled = controlled;
          loop$path = path;
          loop$events = events2;
          loop$old = remaining_old;
          loop$new = new$5;
          loop$added = added;
          loop$removed = prepend(prev, removed);
        }
      } else if ($ instanceof Eq) {
        if (prev instanceof Attribute) {
          if (next instanceof Attribute) {
            let _block;
            let $1 = next.name;
            if ($1 === "value") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "checked") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "selected") {
              _block = controlled || prev.value !== next.value;
            } else {
              _block = prev.value !== next.value;
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path;
            loop$events = events2;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (next instanceof Event2) {
            let name = next.name;
            let handler = next.handler;
            loop$controlled = controlled;
            loop$path = path;
            loop$events = add_event(events2, path, name, handler);
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = prepend(next, added);
            loop$removed = prepend(prev, removed);
          } else {
            loop$controlled = controlled;
            loop$path = path;
            loop$events = events2;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = prepend(next, added);
            loop$removed = prepend(prev, removed);
          }
        } else if (prev instanceof Property) {
          if (next instanceof Property) {
            let _block;
            let $1 = next.name;
            if ($1 === "scrollLeft") {
              _block = true;
            } else if ($1 === "scrollRight") {
              _block = true;
            } else if ($1 === "value") {
              _block = controlled || !isEqual2(prev.value, next.value);
            } else if ($1 === "checked") {
              _block = controlled || !isEqual2(prev.value, next.value);
            } else if ($1 === "selected") {
              _block = controlled || !isEqual2(prev.value, next.value);
            } else {
              _block = !isEqual2(prev.value, next.value);
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path;
            loop$events = events2;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (next instanceof Event2) {
            let name = next.name;
            let handler = next.handler;
            loop$controlled = controlled;
            loop$path = path;
            loop$events = add_event(events2, path, name, handler);
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = prepend(next, added);
            loop$removed = prepend(prev, removed);
          } else {
            loop$controlled = controlled;
            loop$path = path;
            loop$events = events2;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = prepend(next, added);
            loop$removed = prepend(prev, removed);
          }
        } else if (next instanceof Event2) {
          let name = next.name;
          let handler = next.handler;
          let has_changes = prev.prevent_default.kind !== next.prevent_default.kind || prev.stop_propagation.kind !== next.stop_propagation.kind || prev.debounce !== next.debounce || prev.throttle !== next.throttle;
          let _block;
          if (has_changes) {
            _block = prepend(next, added);
          } else {
            _block = added;
          }
          let added$1 = _block;
          loop$controlled = controlled;
          loop$path = path;
          loop$events = add_event(events2, path, name, handler);
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = added$1;
          loop$removed = removed;
        } else {
          let name = prev.name;
          loop$controlled = controlled;
          loop$path = path;
          loop$events = remove_event(events2, path, name);
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = prepend(next, added);
          loop$removed = prepend(prev, removed);
        }
      } else if (next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        loop$controlled = controlled;
        loop$path = path;
        loop$events = add_event(events2, path, name, handler);
        loop$old = old;
        loop$new = remaining_new;
        loop$added = prepend(next, added);
        loop$removed = removed;
      } else {
        loop$controlled = controlled;
        loop$path = path;
        loop$events = events2;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = prepend(next, added);
        loop$removed = removed;
      }
    }
  }
}
function is_controlled(cache, namespace, tag, path) {
  if (tag === "input" && namespace === "") {
    return has_dispatched_events(cache, path);
  } else if (tag === "select" && namespace === "") {
    return has_dispatched_events(cache, path);
  } else if (tag === "textarea" && namespace === "") {
    return has_dispatched_events(cache, path);
  } else {
    return false;
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$changes, loop$children, loop$path, loop$cache, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$5 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let changes = loop$changes;
    let children = loop$children;
    let path = loop$path;
    let cache = loop$cache;
    let events2 = loop$events;
    if (old instanceof Empty) {
      if (new$5 instanceof Empty) {
        let _block;
        let $ = is_browser();
        if (changes instanceof Empty) {
          if (children instanceof Empty) {
            _block = new$3(patch_index, removed, changes, children);
          } else if (!$) {
            let $1 = children.tail;
            if ($1 instanceof Empty && removed === 0) {
              let child2 = children.head;
              _block = add_parent(child2, patch_index);
            } else {
              _block = new$3(patch_index, removed, changes, children);
            }
          } else {
            _block = new$3(patch_index, removed, changes, children);
          }
        } else {
          _block = new$3(patch_index, removed, changes, children);
        }
        let patch = _block;
        return new PartialDiff(patch, cache, events2);
      } else {
        let $ = add_children(cache, events2, path, node_index, new$5);
        let cache$1 = $[0];
        let events$1 = $[1];
        let insert4 = insert3(new$5, node_index - moved_offset);
        let changes$1 = prepend(insert4, changes);
        let patch = new$3(patch_index, removed, changes$1, children);
        return new PartialDiff(patch, cache$1, events$1);
      }
    } else if (new$5 instanceof Empty) {
      let prev = old.head;
      let old$1 = old.tail;
      let $ = prev.key === "" || !has_key(moved, prev.key);
      if ($) {
        let events$1 = remove_child(cache, events2, path, node_index, prev);
        loop$old = old$1;
        loop$old_keyed = old_keyed;
        loop$new = new$5;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset;
        loop$removed = removed + 1;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$changes = changes;
        loop$children = children;
        loop$path = path;
        loop$cache = cache;
        loop$events = events$1;
      } else {
        loop$old = old$1;
        loop$old_keyed = old_keyed;
        loop$new = new$5;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$changes = changes;
        loop$children = children;
        loop$path = path;
        loop$cache = cache;
        loop$events = events2;
      }
    } else {
      let prev = old.head;
      let next = new$5.head;
      if (prev.key !== next.key) {
        let old_remaining = old.tail;
        let new_remaining = new$5.tail;
        let next_did_exist = has_key(old_keyed, next.key);
        let prev_does_exist = has_key(new_keyed, prev.key);
        if (prev_does_exist) {
          if (next_did_exist) {
            let $ = has_key(moved, prev.key);
            if ($) {
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new$5;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset - 1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children;
              loop$path = path;
              loop$cache = cache;
              loop$events = events2;
            } else {
              let match = get2(old_keyed, next.key);
              let before = node_index - moved_offset;
              let changes$1 = prepend(move(next.key, before), changes);
              let moved$1 = insert2(moved, next.key, undefined);
              loop$old = prepend(match, old);
              loop$old_keyed = old_keyed;
              loop$new = new$5;
              loop$new_keyed = new_keyed;
              loop$moved = moved$1;
              loop$moved_offset = moved_offset + 1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$changes = changes$1;
              loop$children = children;
              loop$path = path;
              loop$cache = cache;
              loop$events = events2;
            }
          } else {
            let before = node_index - moved_offset;
            let $ = add_child(cache, events2, path, node_index, next);
            let cache$1 = $[0];
            let events$1 = $[1];
            let insert4 = insert3(singleton_list(next), before);
            let changes$1 = prepend(insert4, changes);
            loop$old = old;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset + 1;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = changes$1;
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if (next_did_exist) {
          let index3 = node_index - moved_offset;
          let changes$1 = prepend(remove2(index3), changes);
          let events$1 = remove_child(cache, events2, path, node_index, prev);
          loop$old = old_remaining;
          loop$old_keyed = old_keyed;
          loop$new = new$5;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset - 1;
          loop$removed = removed;
          loop$node_index = node_index;
          loop$patch_index = patch_index;
          loop$changes = changes$1;
          loop$children = children;
          loop$path = path;
          loop$cache = cache;
          loop$events = events$1;
        } else {
          let change = replace2(node_index - moved_offset, next);
          let $ = replace_child(cache, events2, path, node_index, prev, next);
          let cache$1 = $[0];
          let events$1 = $[1];
          loop$old = old_remaining;
          loop$old_keyed = old_keyed;
          loop$new = new_remaining;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset;
          loop$removed = removed;
          loop$node_index = node_index + 1;
          loop$patch_index = patch_index;
          loop$changes = prepend(change, changes);
          loop$children = children;
          loop$path = path;
          loop$cache = cache$1;
          loop$events = events$1;
        }
      } else {
        let $ = old.head;
        if ($ instanceof Fragment) {
          let $1 = new$5.head;
          if ($1 instanceof Fragment) {
            let prev2 = $;
            let old$1 = old.tail;
            let next2 = $1;
            let new$1 = new$5.tail;
            let $2 = do_diff(prev2.children, prev2.keyed_children, next2.children, next2.keyed_children, empty2(), 0, 0, 0, node_index, empty_list, empty_list, add2(path, node_index, next2.key), cache, events2);
            let patch = $2.patch;
            let cache$1 = $2.cache;
            let events$1 = $2.events;
            let _block;
            let $3 = patch.changes;
            if ($3 instanceof Empty) {
              let $4 = patch.children;
              if ($4 instanceof Empty) {
                let $5 = patch.removed;
                if ($5 === 0) {
                  _block = children;
                } else {
                  _block = prepend(patch, children);
                }
              } else {
                _block = prepend(patch, children);
              }
            } else {
              _block = prepend(patch, children);
            }
            let children$1 = _block;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = changes;
            loop$children = children$1;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1 = $2[0];
            let events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if ($ instanceof Element) {
          let $1 = new$5.head;
          if ($1 instanceof Element) {
            let prev2 = $;
            let next2 = $1;
            if (prev2.namespace === next2.namespace && prev2.tag === next2.tag) {
              let old$1 = old.tail;
              let new$1 = new$5.tail;
              let child_path = add2(path, node_index, next2.key);
              let controlled = is_controlled(cache, next2.namespace, next2.tag, child_path);
              let $2 = diff_attributes(controlled, child_path, events2, prev2.attributes, next2.attributes, empty_list, empty_list);
              let added_attrs = $2.added;
              let removed_attrs = $2.removed;
              let events$1 = $2.events;
              let _block;
              if (added_attrs instanceof Empty && removed_attrs instanceof Empty) {
                _block = empty_list;
              } else {
                _block = singleton_list(update(added_attrs, removed_attrs));
              }
              let initial_child_changes = _block;
              let $3 = do_diff(prev2.children, prev2.keyed_children, next2.children, next2.keyed_children, empty2(), 0, 0, 0, node_index, initial_child_changes, empty_list, child_path, cache, events$1);
              let patch = $3.patch;
              let cache$1 = $3.cache;
              let events$2 = $3.events;
              let _block$1;
              let $4 = patch.changes;
              if ($4 instanceof Empty) {
                let $5 = patch.children;
                if ($5 instanceof Empty) {
                  let $6 = patch.removed;
                  if ($6 === 0) {
                    _block$1 = children;
                  } else {
                    _block$1 = prepend(patch, children);
                  }
                } else {
                  _block$1 = prepend(patch, children);
                }
              } else {
                _block$1 = prepend(patch, children);
              }
              let children$1 = _block$1;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children$1;
              loop$path = path;
              loop$cache = cache$1;
              loop$events = events$2;
            } else {
              let prev3 = $;
              let old_remaining = old.tail;
              let next3 = $1;
              let new_remaining = new$5.tail;
              let change = replace2(node_index - moved_offset, next3);
              let $2 = replace_child(cache, events2, path, node_index, prev3, next3);
              let cache$1 = $2[0];
              let events$1 = $2[1];
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new_remaining;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = prepend(change, changes);
              loop$children = children;
              loop$path = path;
              loop$cache = cache$1;
              loop$events = events$1;
            }
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1 = $2[0];
            let events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if ($ instanceof Text) {
          let $1 = new$5.head;
          if ($1 instanceof Text) {
            let prev2 = $;
            let next2 = $1;
            if (prev2.content === next2.content) {
              let old$1 = old.tail;
              let new$1 = new$5.tail;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children;
              loop$path = path;
              loop$cache = cache;
              loop$events = events2;
            } else {
              let old$1 = old.tail;
              let next3 = $1;
              let new$1 = new$5.tail;
              let child2 = new$3(node_index, 0, singleton_list(replace_text(next3.content)), empty_list);
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = prepend(child2, children);
              loop$path = path;
              loop$cache = cache;
              loop$events = events2;
            }
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1 = $2[0];
            let events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if ($ instanceof UnsafeInnerHtml) {
          let $1 = new$5.head;
          if ($1 instanceof UnsafeInnerHtml) {
            let prev2 = $;
            let old$1 = old.tail;
            let next2 = $1;
            let new$1 = new$5.tail;
            let child_path = add2(path, node_index, next2.key);
            let $2 = diff_attributes(false, child_path, events2, prev2.attributes, next2.attributes, empty_list, empty_list);
            let added_attrs = $2.added;
            let removed_attrs = $2.removed;
            let events$1 = $2.events;
            let _block;
            if (added_attrs instanceof Empty && removed_attrs instanceof Empty) {
              _block = empty_list;
            } else {
              _block = singleton_list(update(added_attrs, removed_attrs));
            }
            let child_changes = _block;
            let _block$1;
            let $3 = prev2.inner_html === next2.inner_html;
            if ($3) {
              _block$1 = child_changes;
            } else {
              _block$1 = prepend(replace_inner_html(next2.inner_html), child_changes);
            }
            let child_changes$1 = _block$1;
            let _block$2;
            if (child_changes$1 instanceof Empty) {
              _block$2 = children;
            } else {
              _block$2 = prepend(new$3(node_index, 0, child_changes$1, empty_list), children);
            }
            let children$1 = _block$2;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = changes;
            loop$children = children$1;
            loop$path = path;
            loop$cache = cache;
            loop$events = events$1;
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1 = $2[0];
            let events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if ($ instanceof Map2) {
          let $1 = new$5.head;
          if ($1 instanceof Map2) {
            let prev2 = $;
            let old$1 = old.tail;
            let next2 = $1;
            let new$1 = new$5.tail;
            let child_path = add2(path, node_index, next2.key);
            let child_key = child(child_path);
            let $2 = do_diff(singleton_list(prev2.child), empty2(), singleton_list(next2.child), empty2(), empty2(), 0, 0, 0, node_index, empty_list, empty_list, subtree(child_path), cache, get_subtree(events2, child_key, prev2.mapper));
            let patch = $2.patch;
            let cache$1 = $2.cache;
            let child_events = $2.events;
            let events$1 = update_subtree(events2, child_key, next2.mapper, child_events);
            let _block;
            let $3 = patch.changes;
            if ($3 instanceof Empty) {
              let $4 = patch.children;
              if ($4 instanceof Empty) {
                let $5 = patch.removed;
                if ($5 === 0) {
                  _block = children;
                } else {
                  _block = prepend(patch, children);
                }
              } else {
                _block = prepend(patch, children);
              }
            } else {
              _block = prepend(patch, children);
            }
            let children$1 = _block;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = changes;
            loop$children = children$1;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1 = $2[0];
            let events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else {
          let $1 = new$5.head;
          if ($1 instanceof Memo) {
            let prev2 = $;
            let old$1 = old.tail;
            let next2 = $1;
            let new$1 = new$5.tail;
            let $2 = equal_lists(prev2.dependencies, next2.dependencies);
            if ($2) {
              let cache$1 = keep_memo(cache, prev2.view, next2.view);
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children;
              loop$path = path;
              loop$cache = cache$1;
              loop$events = events2;
            } else {
              let prev_node = get_old_memo(cache, prev2.view, prev2.view);
              let next_node = next2.view();
              let cache$1 = add_memo(cache, next2.view, next_node);
              loop$old = prepend(prev_node, old$1);
              loop$old_keyed = old_keyed;
              loop$new = prepend(next_node, new$1);
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children;
              loop$path = path;
              loop$cache = cache$1;
              loop$events = events2;
            }
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1 = $2[0];
            let events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        }
      }
    }
  }
}
function diff(cache, old, new$5) {
  let cache$1 = tick(cache);
  let $ = do_diff(singleton_list(old), empty2(), singleton_list(new$5), empty2(), empty2(), 0, 0, 0, 0, empty_list, empty_list, root, cache$1, events(cache$1));
  let patch = $.patch;
  let cache$2 = $.cache;
  let events2 = $.events;
  return new Diff(patch, update_events(cache$2, events2));
}

// build/dev/javascript/lustre/lustre/internals/list.ffi.mjs
var toList2 = (arr) => arr.reduceRight((xs, x) => List$NonEmpty(x, xs), empty_list);
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0;i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4;List$NonEmpty$rest(list4); list4 = List$NonEmpty$rest(list4)) {
      callback(List$NonEmpty$first(list4));
    }
  }
};
var append4 = (a2, b) => {
  if (!List$NonEmpty$rest(a2)) {
    return b;
  } else if (!List$NonEmpty$rest(b)) {
    return a2;
  } else {
    return append(a2, b);
  }
};

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var setTimeout = globalThis.setTimeout;
var clearTimeout = globalThis.clearTimeout;
var createElementNS = (ns, name) => globalThis.document.createElementNS(ns, name);
var createTextNode = (data) => globalThis.document.createTextNode(data);
var createComment = (data) => globalThis.document.createComment(data);
var createDocumentFragment = () => globalThis.document.createDocumentFragment();
var insertBefore = (parent, node, reference) => parent.insertBefore(node, reference);
var moveBefore = SUPPORTS_MOVE_BEFORE ? (parent, node, reference) => parent.moveBefore(node, reference) : insertBefore;
var removeChild = (parent, child2) => parent.removeChild(child2);
var getAttribute = (node, name) => node.getAttribute(name);
var setAttribute = (node, name, value) => node.setAttribute(name, value);
var removeAttribute = (node, name) => node.removeAttribute(name);
var addEventListener = (node, name, handler, options) => node.addEventListener(name, handler, options);
var removeEventListener = (node, name, handler) => node.removeEventListener(name, handler);
var setInnerHtml = (node, innerHtml) => node.innerHTML = innerHtml;
var setData = (node, data) => node.data = data;
var meta = Symbol("lustre");

class MetadataNode {
  constructor(kind, parent, node, key) {
    this.kind = kind;
    this.key = key;
    this.parent = parent;
    this.children = [];
    this.node = node;
    this.endNode = null;
    this.handlers = new Map;
    this.throttles = new Map;
    this.debouncers = new Map;
  }
  get isVirtual() {
    return this.kind === fragment_kind || this.kind === map_kind;
  }
  get parentNode() {
    return this.isVirtual ? this.node.parentNode : this.node;
  }
}
var insertMetadataChild = (kind, parent, node, index3, key) => {
  const child2 = new MetadataNode(kind, parent, node, key);
  node[meta] = child2;
  parent?.children.splice(index3, 0, child2);
  return child2;
};
var getPath = (node) => {
  let path = "";
  for (let current = node[meta];current.parent; current = current.parent) {
    const separator = current.parent && current.parent.kind === map_kind ? separator_subtree : separator_element;
    if (current.key) {
      path = `${separator}${current.key}${path}`;
    } else {
      const index3 = current.parent.children.indexOf(current);
      path = `${separator}${index3}${path}`;
    }
  }
  return path.slice(1);
};

class Reconciler {
  #root = null;
  #decodeEvent;
  #dispatch;
  #debug = false;
  constructor(root2, decodeEvent, dispatch2, { debug = false } = {}) {
    this.#root = root2;
    this.#decodeEvent = decodeEvent;
    this.#dispatch = dispatch2;
    this.#debug = debug;
  }
  mount(vdom) {
    insertMetadataChild(element_kind, null, this.#root, 0, null);
    this.#insertChild(this.#root, null, this.#root[meta], 0, vdom);
  }
  push(patch, memos2 = null) {
    this.#memos = memos2;
    this.#stack.push({ node: this.#root[meta], patch });
    this.#reconcile();
  }
  #memos;
  #stack = [];
  #reconcile() {
    const stack = this.#stack;
    while (stack.length) {
      let { node, patch } = stack.pop();
      const { path, changes, removed, children: childPatches } = patch;
      iterate(path, (index3) => {
        node = node.children[index3];
      });
      const { children: childNodes } = node;
      iterate(changes, (change) => this.#patch(node, change));
      if (removed) {
        this.#removeChildren(node, childNodes.length - removed, removed);
      }
      iterate(childPatches, (childPatch) => {
        const child2 = childNodes[childPatch.index | 0];
        this.#stack.push({ node: child2, patch: childPatch });
      });
    }
  }
  #patch(node, change) {
    switch (change.kind) {
      case replace_text_kind:
        this.#replaceText(node, change);
        break;
      case replace_inner_html_kind:
        this.#replaceInnerHtml(node, change);
        break;
      case update_kind:
        this.#update(node, change);
        break;
      case move_kind:
        this.#move(node, change);
        break;
      case remove_kind:
        this.#remove(node, change);
        break;
      case replace_kind:
        this.#replace(node, change);
        break;
      case insert_kind:
        this.#insert(node, change);
        break;
    }
  }
  #insert(parent, { children, before }) {
    const fragment3 = createDocumentFragment();
    const beforeEl = this.#getReference(parent, before);
    this.#insertChildren(fragment3, null, parent, before | 0, children);
    insertBefore(parent.parentNode, fragment3, beforeEl);
  }
  #replace(parent, { index: index3, with: child2 }) {
    this.#removeChildren(parent, index3 | 0, 1);
    const beforeEl = this.#getReference(parent, index3);
    this.#insertChild(parent.parentNode, beforeEl, parent, index3 | 0, child2);
  }
  #getReference(node, index3) {
    index3 = index3 | 0;
    const { children } = node;
    const childCount = children.length;
    if (index3 < childCount)
      return children[index3].node;
    if (node.endNode)
      return node.endNode;
    if (!node.isVirtual)
      return null;
    while (node.isVirtual && node.children.length) {
      if (node.endNode)
        return node.endNode.nextSibling;
      node = node.children[node.children.length - 1];
    }
    return node.node.nextSibling;
  }
  #move(parent, { key, before }) {
    before = before | 0;
    const { children, parentNode } = parent;
    const beforeEl = children[before].node;
    let prev = children[before];
    for (let i = before + 1;i < children.length; ++i) {
      const next = children[i];
      children[i] = prev;
      prev = next;
      if (next.key === key) {
        children[before] = next;
        break;
      }
    }
    this.#moveChild(parentNode, prev, beforeEl);
  }
  #moveChildren(domParent, children, beforeEl) {
    for (let i = 0;i < children.length; ++i) {
      this.#moveChild(domParent, children[i], beforeEl);
    }
  }
  #moveChild(domParent, child2, beforeEl) {
    moveBefore(domParent, child2.node, beforeEl);
    if (child2.isVirtual) {
      this.#moveChildren(domParent, child2.children, beforeEl);
    }
    if (child2.endNode) {
      moveBefore(domParent, child2.endNode, beforeEl);
    }
  }
  #remove(parent, { index: index3 }) {
    this.#removeChildren(parent, index3, 1);
  }
  #removeChildren(parent, index3, count2) {
    const { children, parentNode } = parent;
    const deleted = children.splice(index3, count2);
    for (let i = 0;i < deleted.length; ++i) {
      const child2 = deleted[i];
      const { node, endNode, isVirtual, children: nestedChildren } = child2;
      removeChild(parentNode, node);
      if (endNode) {
        removeChild(parentNode, endNode);
      }
      this.#removeDebouncers(child2);
      if (isVirtual) {
        deleted.push(...nestedChildren);
      }
    }
  }
  #removeDebouncers(node) {
    const { debouncers, children } = node;
    for (const { timeout } of debouncers.values()) {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
    debouncers.clear();
    iterate(children, (child2) => this.#removeDebouncers(child2));
  }
  #update({ node, handlers, throttles, debouncers }, { added, removed }) {
    iterate(removed, ({ name }) => {
      if (handlers.delete(name)) {
        removeEventListener(node, name, handleEvent);
        this.#updateDebounceThrottle(throttles, name, 0);
        this.#updateDebounceThrottle(debouncers, name, 0);
      } else {
        removeAttribute(node, name);
        SYNCED_ATTRIBUTES[name]?.removed?.(node, name);
      }
    });
    iterate(added, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #replaceText({ node }, { content }) {
    setData(node, content ?? "");
  }
  #replaceInnerHtml({ node }, { inner_html }) {
    setInnerHtml(node, inner_html ?? "");
  }
  #insertChildren(domParent, beforeEl, metaParent, index3, children) {
    iterate(children, (child2) => this.#insertChild(domParent, beforeEl, metaParent, index3++, child2));
  }
  #insertChild(domParent, beforeEl, metaParent, index3, vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = this.#createElement(metaParent, index3, vnode);
        this.#insertChildren(node, null, node[meta], 0, vnode.children);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case text_kind: {
        const node = this.#createTextNode(metaParent, index3, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case fragment_kind: {
        const marker = "lustre:fragment";
        const head = this.#createHead(marker, metaParent, index3, vnode);
        insertBefore(domParent, head, beforeEl);
        this.#insertChildren(domParent, beforeEl, head[meta], 0, vnode.children);
        if (this.#debug) {
          head[meta].endNode = createComment(` /${marker} `);
          insertBefore(domParent, head[meta].endNode, beforeEl);
        }
        break;
      }
      case unsafe_inner_html_kind: {
        const node = this.#createElement(metaParent, index3, vnode);
        this.#replaceInnerHtml({ node }, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case map_kind: {
        const head = this.#createHead("lustre:map", metaParent, index3, vnode);
        insertBefore(domParent, head, beforeEl);
        this.#insertChild(domParent, beforeEl, head[meta], 0, vnode.child);
        break;
      }
      case memo_kind: {
        const child2 = this.#memos?.get(vnode.view) ?? vnode.view();
        this.#insertChild(domParent, beforeEl, metaParent, index3, child2);
        break;
      }
    }
  }
  #createElement(parent, index3, { kind, key, tag, namespace, attributes }) {
    const node = createElementNS(namespace || NAMESPACE_HTML, tag);
    insertMetadataChild(kind, parent, node, index3, key);
    if (this.#debug && key) {
      setAttribute(node, "data-lustre-key", key);
    }
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
    return node;
  }
  #createTextNode(parent, index3, { kind, key, content }) {
    const node = createTextNode(content ?? "");
    insertMetadataChild(kind, parent, node, index3, key);
    return node;
  }
  #createHead(marker, parent, index3, { kind, key }) {
    const node = this.#debug ? createComment(markerComment(marker, key)) : createTextNode("");
    insertMetadataChild(kind, parent, node, index3, key);
    return node;
  }
  #createAttribute(node, attribute3) {
    const { debouncers, handlers, throttles } = node[meta];
    const {
      kind,
      name,
      value,
      prevent_default: prevent,
      debounce: debounceDelay,
      throttle: throttleDelay
    } = attribute3;
    switch (kind) {
      case attribute_kind: {
        const valueOrDefault = value ?? "";
        if (name === "virtual:defaultValue") {
          node.defaultValue = valueOrDefault;
          return;
        } else if (name === "virtual:defaultChecked") {
          node.defaultChecked = true;
          return;
        } else if (name === "virtual:defaultSelected") {
          node.defaultSelected = true;
          return;
        }
        if (valueOrDefault !== getAttribute(node, name)) {
          setAttribute(node, name, valueOrDefault);
        }
        SYNCED_ATTRIBUTES[name]?.added?.(node, valueOrDefault);
        break;
      }
      case property_kind:
        node[name] = value;
        break;
      case event_kind: {
        if (handlers.has(name)) {
          removeEventListener(node, name, handleEvent);
        }
        const passive = prevent.kind === never_kind;
        addEventListener(node, name, handleEvent, { passive });
        this.#updateDebounceThrottle(throttles, name, throttleDelay);
        this.#updateDebounceThrottle(debouncers, name, debounceDelay);
        handlers.set(name, (event2) => this.#handleEvent(attribute3, event2));
        break;
      }
    }
  }
  #updateDebounceThrottle(map7, name, delay) {
    const debounceOrThrottle = map7.get(name);
    if (delay > 0) {
      if (debounceOrThrottle) {
        debounceOrThrottle.delay = delay;
      } else {
        map7.set(name, { delay });
      }
    } else if (debounceOrThrottle) {
      const { timeout } = debounceOrThrottle;
      if (timeout) {
        clearTimeout(timeout);
      }
      map7.delete(name);
    }
  }
  #handleEvent(attribute3, event2) {
    const { currentTarget, type } = event2;
    const { debouncers, throttles } = currentTarget[meta];
    const path = getPath(currentTarget);
    const {
      prevent_default: prevent,
      stop_propagation: stop,
      include
    } = attribute3;
    if (prevent.kind === always_kind)
      event2.preventDefault();
    if (stop.kind === always_kind)
      event2.stopPropagation();
    if (type === "submit") {
      event2.detail ??= {};
      event2.detail.formData = [
        ...new FormData(event2.target, event2.submitter).entries()
      ];
    }
    const data = this.#decodeEvent(event2, path, type, include);
    const throttle = throttles.get(type);
    if (throttle) {
      const now = Date.now();
      const last = throttle.last || 0;
      if (now > last + throttle.delay) {
        throttle.last = now;
        throttle.lastEvent = event2;
        this.#dispatch(event2, data);
      }
    }
    const debounce = debouncers.get(type);
    if (debounce) {
      clearTimeout(debounce.timeout);
      debounce.timeout = setTimeout(() => {
        if (event2 === throttles.get(type)?.lastEvent)
          return;
        this.#dispatch(event2, data);
      }, debounce.delay);
    }
    if (!throttle && !debounce) {
      this.#dispatch(event2, data);
    }
  }
}
var markerComment = (marker, key) => {
  if (key) {
    return ` ${marker} key="${escape(key)}" `;
  } else {
    return ` ${marker} `;
  }
};
var handleEvent = (event2) => {
  const { currentTarget, type } = event2;
  const handler = currentTarget[meta].handlers.get(type);
  handler(event2);
};
var syncedBooleanAttribute = (name) => {
  return {
    added(node) {
      node[name] = true;
    },
    removed(node) {
      node[name] = false;
    }
  };
};
var syncedAttribute = (name) => {
  return {
    added(node, value) {
      node[name] = value;
    }
  };
};
var SYNCED_ATTRIBUTES = {
  checked: syncedBooleanAttribute("checked"),
  selected: syncedBooleanAttribute("selected"),
  value: syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => {
        node.focus?.();
      });
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/element/keyed.mjs
function do_extract_keyed_children(loop$key_children_pairs, loop$keyed_children, loop$children) {
  while (true) {
    let key_children_pairs = loop$key_children_pairs;
    let keyed_children = loop$keyed_children;
    let children = loop$children;
    if (key_children_pairs instanceof Empty) {
      return [keyed_children, reverse(children)];
    } else {
      let rest = key_children_pairs.tail;
      let key = key_children_pairs.head[0];
      let element$1 = key_children_pairs.head[1];
      let keyed_element = to_keyed(key, element$1);
      let _block;
      if (key === "") {
        _block = keyed_children;
      } else {
        _block = insert2(keyed_children, key, keyed_element);
      }
      let keyed_children$1 = _block;
      let children$1 = prepend(keyed_element, children);
      loop$key_children_pairs = rest;
      loop$keyed_children = keyed_children$1;
      loop$children = children$1;
    }
  }
}
function extract_keyed_children(children) {
  return do_extract_keyed_children(children, empty2(), empty_list);
}
function element3(tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children = $[0];
  let children$1 = $[1];
  return element("", "", tag, attributes, children$1, keyed_children, false, is_void_html_element(tag, ""));
}
function namespaced2(namespace, tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children = $[0];
  let children$1 = $[1];
  return element("", namespace, tag, attributes, children$1, keyed_children, false, is_void_html_element(tag, namespace));
}
function fragment3(children) {
  let $ = extract_keyed_children(children);
  let keyed_children = $[0];
  let children$1 = $[1];
  return fragment("", children$1, keyed_children);
}

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root2) => {
  const rootMeta = insertMetadataChild(element_kind, null, root2, 0, null);
  const { children } = virtualiseChildren(rootMeta, root2, root2.firstChild);
  if (children.length > 1) {
    const rootNodeMeta = insertMetadataChild(element_kind, null, root2, 0, null);
    rootMeta.kind = fragment_kind;
    rootMeta.node = globalThis.document.createTextNode("");
    rootMeta.parent = rootNodeMeta;
    rootNodeMeta.children.push(rootMeta);
    root2.insertBefore(rootMeta.node, root2.firstChild);
    return fragment3(toList3(children));
  }
  if (children.length === 1) {
    return children[0][1];
  }
  const placeholder = globalThis.document.createTextNode("");
  insertMetadataChild(text_kind, rootMeta, placeholder, 0, null);
  root2.insertBefore(placeholder, root2.firstChild);
  return none2();
};
var virtualiseChild = (meta2, domParent, child2, index3) => {
  if (child2.nodeType === COMMENT_NODE) {
    const data = child2.data.trim();
    if (data.startsWith("lustre:fragment")) {
      return virtualiseFragment(meta2, domParent, child2, index3);
    }
    if (data.startsWith("lustre:map")) {
      return virtualiseMap(meta2, domParent, child2, index3);
    }
    if (data.startsWith("lustre:memo")) {
      return virtualiseMemo(meta2, domParent, child2, index3);
    }
    return null;
  }
  if (child2.nodeType === ELEMENT_NODE) {
    return virtualiseElement(meta2, child2, index3);
  }
  if (child2.nodeType === TEXT_NODE) {
    return virtualiseText(meta2, child2, index3);
  }
  return null;
};
var virtualiseElement = (metaParent, node, index3) => {
  const key = node.getAttribute("data-lustre-key") ?? "";
  if (key) {
    node.removeAttribute("data-lustre-key");
  }
  const meta2 = insertMetadataChild(element_kind, metaParent, node, index3, key);
  const tag = node.localName;
  const namespace = node.namespaceURI;
  const isHtmlElement = !namespace || namespace === NAMESPACE_HTML;
  if (isHtmlElement && INPUT_ELEMENTS.includes(tag)) {
    virtualiseInputEvents(tag, node);
  }
  const attributes = virtualiseAttributes(node);
  const { children } = virtualiseChildren(meta2, node, node.firstChild);
  const vnode = isHtmlElement ? element3(tag, attributes, toList3(children)) : namespaced2(namespace, tag, attributes, toList3(children));
  return childResult(key, vnode, node.nextSibling);
};
var virtualiseChildren = (meta2, domParent, childNode) => {
  const children = [];
  while (childNode && (childNode.nodeType !== COMMENT_NODE || childNode.data.trim() !== "/lustre:fragment")) {
    const child2 = virtualiseChild(meta2, domParent, childNode, children.length);
    if (child2) {
      children.push([child2.key, child2.vnode]);
      childNode = child2.next;
    } else {
      childNode = childNode.nextSibling;
    }
  }
  return { children, end: childNode };
};
var virtualiseText = (meta2, node, index3) => {
  insertMetadataChild(text_kind, meta2, node, index3, null);
  return childResult("", text2(node.data), node.nextSibling);
};
var virtualiseFragment = (metaParent, domParent, node, index3) => {
  const key = parseKey(node.data);
  const meta2 = insertMetadataChild(fragment_kind, metaParent, node, index3, key);
  const { children, end } = virtualiseChildren(meta2, domParent, node.nextSibling);
  meta2.endNode = end;
  const vnode = fragment3(toList3(children));
  return childResult(key, vnode, end?.nextSibling);
};
var virtualiseMap = (metaParent, domParent, node, index3) => {
  const key = parseKey(node.data);
  const meta2 = insertMetadataChild(map_kind, metaParent, node, index3, key);
  const child2 = virtualiseNextChild(meta2, domParent, node, 0);
  if (!child2)
    return null;
  const vnode = map6(child2.vnode, (x) => x);
  return childResult(key, vnode, child2.next);
};
var virtualiseMemo = (meta2, domParent, node, index3) => {
  const key = parseKey(node.data);
  const child2 = virtualiseNextChild(meta2, domParent, node, index3);
  if (!child2)
    return null;
  domParent.removeChild(node);
  const vnode = memo2(toList3([ref({})]), () => child2.vnode);
  return childResult(key, vnode, child2.next);
};
var virtualiseNextChild = (meta2, domParent, node, index3) => {
  while (true) {
    node = node.nextSibling;
    if (!node)
      return null;
    const child2 = virtualiseChild(meta2, domParent, node, index3);
    if (child2)
      return child2;
  }
};
var childResult = (key, vnode, next) => {
  return { key, vnode, next };
};
var virtualiseAttributes = (node) => {
  const attributes = [];
  for (let i = 0;i < node.attributes.length; i++) {
    const attr = node.attributes[i];
    if (attr.name !== "xmlns") {
      attributes.push(attribute2(attr.localName, attr.value));
    }
  }
  return toList3(attributes);
};
var INPUT_ELEMENTS = ["input", "select", "textarea"];
var virtualiseInputEvents = (tag, node) => {
  const value = node.value;
  const checked2 = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked2)
    return;
  if (tag === "input" && node.type === "radio" && !checked2)
    return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value)
    return;
  queueMicrotask(() => {
    node.value = value;
    node.checked = checked2;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (globalThis.document.activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var parseKey = (data) => {
  const keyMatch = data.match(/key="([^"]*)"/);
  if (!keyMatch)
    return "";
  return unescapeKey(keyMatch[1]);
};
var unescapeKey = (key) => {
  return key.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'");
};
var toList3 = (arr) => arr.reduceRight((xs, x) => List$NonEmpty(x, xs), empty_list);

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!globalThis.document;
class Runtime {
  constructor(root2, [model, effects], view, update2, options) {
    this.root = root2;
    this.#model = model;
    this.#view = view;
    this.#update = update2;
    this.root.addEventListener("context-request", (event2) => {
      if (!(event2.context && event2.callback))
        return;
      if (!this.#contexts.has(event2.context))
        return;
      event2.stopImmediatePropagation();
      const context = this.#contexts.get(event2.context);
      if (event2.subscribe) {
        const unsubscribe2 = () => {
          context.subscribers = context.subscribers.filter((subscriber) => subscriber !== event2.callback);
        };
        context.subscribers.push([event2.callback, unsubscribe2]);
        event2.callback(context.value, unsubscribe2);
      } else {
        event2.callback(context.value);
      }
    });
    const decodeEvent = (event2, path, name) => decode2(this.#cache, path, name, event2);
    const dispatch2 = (event2, data) => {
      const [cache, result] = dispatch(this.#cache, data);
      this.#cache = cache;
      if (Result$isOk(result)) {
        const handler = Result$Ok$0(result);
        if (handler.stop_propagation)
          event2.stopPropagation();
        if (handler.prevent_default)
          event2.preventDefault();
        this.dispatch(handler.message, false);
      }
    };
    this.#reconciler = new Reconciler(this.root, decodeEvent, dispatch2, options);
    this.#vdom = virtualise(this.root);
    this.#cache = new$4();
    this.#handleEffects(effects);
    this.#render();
  }
  root = null;
  dispatch(message, shouldFlush = false) {
    if (this.#shouldQueue) {
      this.#queue.push(message);
    } else {
      const [model, effects] = this.#update(this.#model, message);
      this.#model = model;
      this.#scheduleRender(shouldFlush);
      this.#handleEffects(effects);
    }
  }
  emit(event2, data) {
    const target2 = this.root.host ?? this.root;
    target2.dispatchEvent(new LustreEvent(event2, data));
  }
  provide(key, value) {
    if (!this.#contexts.has(key)) {
      this.#contexts.set(key, { value, subscribers: [] });
    } else {
      const context = this.#contexts.get(key);
      if (isEqual2(context.value, value)) {
        return;
      }
      context.value = value;
      for (let i = context.subscribers.length - 1;i >= 0; i--) {
        const [subscriber, unsubscribe2] = context.subscribers[i];
        if (!subscriber) {
          context.subscribers.splice(i, 1);
          continue;
        }
        subscriber(value, unsubscribe2);
      }
    }
  }
  subscribe(key, decoder) {
    if (!key)
      return;
    this.#contextSubscriptions.get(key)?.();
    const target2 = this.root.host ?? this.root;
    target2.dispatchEvent(new ContextRequestEvent(key, (value, unsubscribe2) => {
      const previousUnsubscribe = this.#contextSubscriptions.get(key);
      if (previousUnsubscribe !== unsubscribe2) {
        previousUnsubscribe?.();
      }
      const decoded = run(value, decoder);
      this.#contextSubscriptions.set(key, unsubscribe2);
      if (Result$isOk(decoded)) {
        this.dispatch(Result$Ok$0(decoded), true);
      }
    }, true));
  }
  unsubscribe(key) {
    const unsubscribe2 = this.#contextSubscriptions.get(key);
    if (unsubscribe2) {
      unsubscribe2();
      this.#contextSubscriptions.delete(key);
    }
  }
  unsubscribeAll() {
    for (const [_, unsubscribe2] of this.#contextSubscriptions) {
      unsubscribe2?.();
    }
    this.#contextSubscriptions.clear();
  }
  #model;
  #view;
  #update;
  #vdom;
  #cache;
  #reconciler;
  #contexts = new Map;
  #contextSubscriptions = new Map;
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #actions = {
    dispatch: (message) => this.dispatch(message),
    emit: (event2, data) => this.emit(event2, data),
    select: () => {},
    root: () => this.root,
    provide: (key, value) => this.provide(key, value),
    subscribe: (key, decoder) => this.subscribe(key, decoder),
    unsubscribe: (key) => this.unsubscribe(key)
  };
  #scheduleRender(shouldFlush = false) {
    if (this.#renderTimer)
      return;
    if (shouldFlush) {
      this.#renderTimer = "sync";
      queueMicrotask(() => this.#render());
    } else {
      this.#renderTimer = window.requestAnimationFrame(() => this.#render());
    }
  }
  #handleEffects(effects) {
    this.#shouldQueue = true;
    let updateCalledDuringEffects = false;
    while (true) {
      iterate(effects.synchronous, (effect) => effect(this.#actions));
      this.#beforePaint = append4(this.#beforePaint, effects.before_paint);
      this.#afterPaint = append4(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length)
        break;
      const message = this.#queue.shift();
      [this.#model, effects] = this.#update(this.#model, message);
      updateCalledDuringEffects = true;
    }
    this.#shouldQueue = false;
    return updateCalledDuringEffects;
  }
  #handleAsyncEffects(effects) {
    if (this.#handleEffects(effects)) {
      this.#scheduleRender(true);
    }
  }
  #render() {
    this.#renderTimer = null;
    const next = this.#view(this.#model);
    const { patch, cache } = diff(this.#cache, this.#vdom, next);
    this.#cache = cache;
    this.#vdom = next;
    this.#reconciler.push(patch, memos(cache));
    if (List$isNonEmpty(this.#beforePaint)) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => this.#handleAsyncEffects(effects));
    }
    if (List$isNonEmpty(this.#afterPaint)) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      window.requestAnimationFrame(() => this.#handleAsyncEffects(effects));
    }
  }
}
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
var copiedStyleSheets = new WeakMap;
async function adoptStylesheets(shadowRoot) {
  const pendingParentStylesheets = [];
  for (const node of globalThis.document.querySelectorAll("link[rel=stylesheet], style")) {
    if (node.sheet)
      continue;
    pendingParentStylesheets.push(new Promise((resolve, reject) => {
      node.addEventListener("load", resolve);
      node.addEventListener("error", reject);
    }));
  }
  await Promise.allSettled(pendingParentStylesheets);
  if (!shadowRoot.host.isConnected) {
    return [];
  }
  shadowRoot.adoptedStyleSheets = shadowRoot.host.getRootNode().adoptedStyleSheets;
  const pending = [];
  for (const sheet of globalThis.document.styleSheets) {
    try {
      shadowRoot.adoptedStyleSheets.push(sheet);
    } catch {
      try {
        let copiedSheet = copiedStyleSheets.get(sheet);
        if (!copiedSheet) {
          copiedSheet = new CSSStyleSheet;
          for (const rule of sheet.cssRules) {
            copiedSheet.insertRule(rule.cssText, copiedSheet.cssRules.length);
          }
          copiedStyleSheets.set(sheet, copiedSheet);
        }
        shadowRoot.adoptedStyleSheets.push(copiedSheet);
      } catch {
        const node = sheet.ownerNode.cloneNode();
        shadowRoot.prepend(node);
        pending.push(node);
      }
    }
  }
  return pending;
}

class ContextRequestEvent extends Event {
  constructor(context, callback, subscribe2) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
    this.subscribe = subscribe2;
  }
}

class LustreEvent extends CustomEvent {
  isLustreEvent = true;
  constructor(name, detail) {
    super(name, { detail, bubbles: true, composed: true });
  }
}

// build/dev/javascript/lustre/lustre/runtime/client/component.ffi.mjs
var make_component = ({ init, update: update2, view, config }, name) => {
  if (!is_browser())
    return Result$Error(Error$NotABrowser());
  if (!name.includes("-"))
    return Result$Error(Error$BadComponentName(name));
  if (globalThis.customElements.get(name)) {
    return Result$Error(Error$ComponentAlreadyRegistered(name));
  }
  const attributes = new Map;
  const observedAttributes = [];
  iterate(config.attributes, ([name2, decoder]) => {
    if (attributes.has(name2))
      return;
    attributes.set(name2, decoder);
    observedAttributes.push(name2);
  });
  const [model, effects] = init(undefined);
  const component = class Component extends globalThis.HTMLElement {
    static get observedAttributes() {
      return observedAttributes;
    }
    static formAssociated = config.is_form_associated;
    #runtime;
    #adoptedStyleNodes = [];
    #initialContexts = config.contexts;
    constructor() {
      super();
      this.internals = this.attachInternals();
      if (!this.internals.shadowRoot) {
        this.attachShadow({
          mode: config.open_shadow_root ? "open" : "closed",
          delegatesFocus: config.delegates_focus
        });
      }
      if (config.adopt_styles) {
        this.#adoptStyleSheets();
      }
      this.#runtime = new Runtime(this.internals.shadowRoot, [model, effects], view, update2);
    }
    connectedCallback() {
      this.#requestContexts();
      if (Option$isSome(config.on_connect)) {
        this.dispatch(Option$Some$0(config.on_connect));
      }
    }
    adoptedCallback() {
      if (config.adopt_styles) {
        this.#adoptStyleSheets();
      }
      this.#unsubscribeContexts();
      if (Option$isSome(config.on_adopt)) {
        this.dispatch(Option$Some$0(config.on_adopt));
      }
    }
    disconnectedCallback() {
      this.#unsubscribeContexts();
      if (Option$isSome(config.on_disconnect)) {
        this.dispatch(Option$Some$0(config.on_disconnect));
      }
    }
    attributeChangedCallback(name2, _, value) {
      const decoded = attributes.get(name2)(value ?? "");
      if (Result$isOk(decoded)) {
        this.dispatch(Result$Ok$0(decoded), true);
      }
    }
    formResetCallback() {
      if (Option$isSome(config.on_form_reset)) {
        this.dispatch(Option$Some$0(config.on_form_reset));
      }
    }
    formStateRestoreCallback(state, reason) {
      switch (reason) {
        case "restore":
          if (Option$isSome(config.on_form_restore)) {
            this.dispatch(Option$Some$0(config.on_form_restore)(state));
          }
          break;
        case "autocomplete":
          if (Option$isSome(config.on_form_autofill)) {
            this.dispatch(Option$Some$0(config.on_form_autofill)(state));
          }
          break;
      }
    }
    formDisabledCallback(disabled2) {
      if (Option$isSome(config.on_form_disabled)) {
        this.dispatch(Option$Some$0(config.on_form_disabled)(disabled2));
      }
    }
    send(message) {
      if (Message$isEffectDispatchedMessage(message)) {
        this.dispatch(message.message, false);
      } else if (Message$isEffectEmitEvent(message)) {
        this.emit(message.name, message.data);
      } else if (Message$isSystemRequestedShutdown(message)) {}
    }
    dispatch(message, shouldFlush = false) {
      this.#runtime.dispatch(message, shouldFlush);
    }
    emit(event2, data) {
      this.#runtime.emit(event2, data);
    }
    provide(key, value) {
      this.#runtime.provide(key, value);
    }
    subscribe(key, decoder) {
      this.#runtime.subscribe(key, decoder);
    }
    unsubscribe(key) {
      this.#runtime.unsubscribe(key);
      this.#initialContexts = filter(this.#initialContexts, (subscription) => {
        return subscription[0] !== key;
      });
    }
    #requestContexts() {
      const requested = new Set;
      iterate(this.#initialContexts, ([key, decoder]) => {
        if (!key)
          return;
        if (requested.has(key))
          return;
        this.#runtime.subscribe(key, decoder);
        requested.add(key);
      });
    }
    #unsubscribeContexts() {
      this.#runtime.unsubscribeAll();
    }
    async#adoptStyleSheets() {
      while (this.#adoptedStyleNodes.length) {
        this.#adoptedStyleNodes.pop().remove();
        this.shadowRoot.firstChild.remove();
      }
      this.#adoptedStyleNodes = await adoptStylesheets(this.internals.shadowRoot);
    }
  };
  iterate(config.properties, ([name2, decoder]) => {
    if (Object.hasOwn(component.prototype, name2)) {
      return;
    }
    Object.defineProperty(component.prototype, name2, {
      get() {
        return this[`_${name2}`];
      },
      set(value) {
        this[`_${name2}`] = value;
        const decoded = run(value, decoder);
        if (Result$isOk(decoded)) {
          this.dispatch(Result$Ok$0(decoded), true);
        }
      }
    });
  });
  globalThis.customElements.define(name, component);
  return Result$Ok(undefined);
};

// build/dev/javascript/lustre/lustre/component.mjs
function on_attribute_change(name, decoder) {
  return new Option((config) => {
    let attributes = prepend([name, decoder], config.attributes);
    return new Config2(config.open_shadow_root, config.adopt_styles, config.delegates_focus, attributes, config.properties, config.contexts, config.is_form_associated, config.on_form_autofill, config.on_form_reset, config.on_form_restore, config.on_form_disabled, config.on_connect, config.on_adopt, config.on_disconnect);
  });
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
class Spa {
  #runtime;
  constructor(root2, [init, effects], update2, view) {
    this.#runtime = new Runtime(root2, [init, effects], view, update2);
  }
  send(message) {
    if (Message$isEffectDispatchedMessage(message)) {
      this.dispatch(message.message, false);
    } else if (Message$isEffectEmitEvent(message)) {
      this.emit(message.name, message.data);
    } else if (Message$isSystemRequestedShutdown(message)) {}
  }
  dispatch(message) {
    this.#runtime.dispatch(message);
  }
  emit(event2, data) {
    this.#runtime.emit(event2, data);
  }
}
var start = ({ init, update: update2, view }, selector, flags) => {
  if (!is_browser())
    return Result$Error(Error$NotABrowser());
  const root2 = selector instanceof HTMLElement ? selector : globalThis.document.querySelector(selector);
  if (!root2)
    return Result$Error(Error$ElementNotFound(selector));
  return Result$Ok(new Spa(root2, init(flags), update2, view));
};

// build/dev/javascript/lustre/lustre/runtime/server/runtime.ffi.mjs
class Runtime2 {
  #model;
  #update;
  #view;
  #config;
  #vdom;
  #cache;
  #providers = make();
  #callbacks = /* @__PURE__ */ new Set;
  constructor(_, init, update2, view, config, start_arguments) {
    const [model, effects] = init(start_arguments);
    this.#model = model;
    this.#update = update2;
    this.#view = view;
    this.#config = config;
    this.#vdom = this.#view(this.#model);
    this.#cache = from_node(this.#vdom);
    this.#handle_effect(effects);
  }
  send(message) {
    if (Message$isClientDispatchedMessage(message)) {
      const { message: message2 } = message2;
      const next = this.#handle_client_message(message2);
      const diff2 = diff(this.#cache, this.#vdom, next);
      this.#vdom = next;
      this.#cache = diff2.cache;
      this.broadcast(reconcile(diff2.patch, memos(diff2.cache)));
    } else if (Message$isClientRegisteredCallback(message)) {
      const { callback } = message;
      this.#callbacks.add(callback);
      callback(mount(this.#config.open_shadow_root, this.#config.adopt_styles, keys(this.#config.attributes), keys(this.#config.properties), keys(this.#config.contexts), this.#providers, this.#vdom, memos(this.#cache)));
      if (Option$isSome(this.#config.on_connect)) {
        this.#dispatch(Option$Some$0(this.#config.on_connect));
      }
    } else if (Message$isClientDeregisteredCallback(message)) {
      const { callback } = message;
      this.#callbacks.delete(callback);
      if (Option$isSome(this.#config.on_disconnect)) {
        this.#dispatch(Option$Some$0(this.#config.on_disconnect));
      }
    } else if (Message$isEffectDispatchedMessage(message)) {
      const { message: message2 } = message2;
      const [model, effect] = this.#update(this.#model, message2);
      const next = this.#view(model);
      const diff2 = diff(this.#cache, this.#vdom, next);
      this.#handle_effect(effect);
      this.#model = model;
      this.#vdom = next;
      this.#cache = diff2.cache;
      this.broadcast(reconcile(diff2.patch, memos(diff2.cache)));
    } else if (Message$isEffectEmitEvent(message)) {
      const { name, data } = message;
      this.broadcast(emit(name, data));
    } else if (Message$isEffectProvidedValue(message)) {
      const { key, value } = message;
      const existing = get(this.#providers, key);
      if (Result$isOk(existing) && isEqual2(Result$Ok$0(existing), value)) {
        return;
      }
      this.#providers = insert(this.#providers, key, value);
      this.broadcast(provide(key, value));
    } else if (Message$isEffectRequestedContextSubscription(message)) {
      const { key, decoder } = message;
      this.broadcast(subscribe(key));
      this.#config.contexts = insert(this.#config.contexts, key, decoder);
    } else if (Message$isEffectRemovedContextSubscription(message)) {
      const { key } = message;
      this.broadcast(unsubscribe(key));
      this.#config.contexts = delete$(this.#config.contexts, key);
    } else if (Message$isSystemRequestedShutdown(message)) {
      this.#model = null;
      this.#update = null;
      this.#view = null;
      this.#config = null;
      this.#vdom = null;
      this.#cache = null;
      this.#providers = null;
      this.#callbacks.clear();
    }
  }
  broadcast(message) {
    for (const callback of this.#callbacks) {
      callback(message);
    }
  }
  #handle_client_message(message) {
    if (ServerMessage$isBatch(message)) {
      const { messages } = message;
      let model = this.#model;
      let effect = none();
      for (let list4 = messages;List$NonEmpty$rest(list4); list4 = List$NonEmpty$rest(list4)) {
        const result = this.#handle_client_message(List$NonEmpty$first(list4));
        if (Result$isOk(result)) {
          model = Result$Ok$0(result)[0];
          effect = batch(toList2([effect, Result$Ok$0(result)[1]]));
          break;
        }
      }
      this.#handle_effect(effect);
      this.#model = model;
      return this.#view(model);
    } else if (ServerMessage$isAttributeChanged(message)) {
      const { name, value } = message;
      const result = this.#handle_attribute_change(name, value);
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      return this.#dispatch(Result$Ok$0(result));
    } else if (ServerMessage$isPropertyChanged(message)) {
      const { name, value } = message;
      const result = this.#handle_properties_change(name, value);
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      return this.#dispatch(Result$Ok$0(result));
    } else if (ServerMessage$isEventFired(message)) {
      const { path, name, event: event2 } = message2;
      const [cache, result] = handle(this.#cache, path, name, event2);
      this.#cache = cache;
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      const { message: message2 } = Result$Ok$0(result);
      return this.#dispatch(message2);
    } else if (ServerMessage$isContextProvided(message)) {
      const { key, value } = message;
      let result = get(this.#config.contexts, key);
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      result = run(value, Result$Ok$0(result));
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      return this.#dispatch(Result$Ok$0(result));
    }
  }
  #dispatch(message) {
    const [model, effects] = this.#update(this.#model, message);
    this.#handle_effect(effects);
    this.#model = model;
    return this.#view(this.#model);
  }
  #handle_attribute_change(name, value) {
    const result = get(this.#config.attributes, name);
    if (!Result$isOk(result)) {
      return result;
    }
    return Result$Ok$0(result)(value);
  }
  #handle_properties_change(name, value) {
    const result = get(this.#config.properties, name);
    if (!Result$isOk(result)) {
      return result;
    }
    return Result$Ok$0(result)(value);
  }
  #handle_effect(effect) {
    const dispatch2 = (message) => this.send(Message$EffectDispatchedMessage(message));
    const emit2 = (name, data) => this.send(Message$EffectEmitEvent(name, data));
    const select = () => {
      return;
    };
    const internals = () => {
      return;
    };
    const provide2 = (key, value) => this.send(Message$EffectProvidedValue(key, value));
    const subscribe2 = (key, decoder) => this.send(Message$EffectRequestedContextSubscription(key, decoder));
    const unsubscribe2 = (key) => this.send(Message$EffectRemovedContextSubscription(key));
    globalThis.queueMicrotask(() => {
      perform(effect, dispatch2, emit2, select, internals, provide2, subscribe2, unsubscribe2);
    });
  }
}

// build/dev/javascript/lustre/lustre.mjs
class BadComponentName extends CustomType {
  constructor(name) {
    super();
    this.name = name;
  }
}
var Error$BadComponentName = (name) => new BadComponentName(name);
class ComponentAlreadyRegistered extends CustomType {
  constructor(name) {
    super();
    this.name = name;
  }
}
var Error$ComponentAlreadyRegistered = (name) => new ComponentAlreadyRegistered(name);
class ElementNotFound extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
}
var Error$ElementNotFound = (selector) => new ElementNotFound(selector);
class NotABrowser extends CustomType {
}
var Error$NotABrowser$const = new NotABrowser;
var Error$NotABrowser = () => Error$NotABrowser$const;
function application(init, update2, view) {
  return new App(Option$None$const, init, update2, view, default_config);
}
function component(init, update2, view, options) {
  return new App(Option$None$const, init, update2, view, configure(options));
}
function start4(app, selector, arguments$) {
  return guard(!is_browser(), new Error(Error$NotABrowser$const), () => {
    return start(app, selector, arguments$);
  });
}
// build/dev/javascript/splitter/splitter_ffi.mjs
function make2(patterns) {
  let pattern = "";
  let cursor = patterns;
  while (List$isNonEmpty(cursor)) {
    if (pattern !== "")
      pattern += "|";
    pattern += escapeRegExp(List$NonEmpty$first(cursor));
    cursor = List$NonEmpty$rest(cursor);
  }
  return new RegExp(pattern);
}
function split3(splitter, string5) {
  const match = string5.match(splitter);
  if (!match)
    return [string5, "", ""];
  const index3 = match.index;
  const delimiter = match[0];
  return [
    string5.slice(0, index3),
    delimiter,
    string5.slice(index3 + delimiter.length)
  ];
}
function split_after(splitter, string5) {
  const match = string5.match(splitter);
  if (!match)
    return [string5, ""];
  const split_point = match.index + match[0].length;
  return [string5.slice(0, split_point), string5.slice(split_point)];
}
function escapeRegExp(string5) {
  return string5.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// build/dev/javascript/splitter/splitter.mjs
function new$5(substrings) {
  let _pipe = substrings;
  let _pipe$1 = filter(_pipe, (x) => {
    return x !== "";
  });
  return make2(_pipe$1);
}
// build/dev/javascript/mork/mork/document.mjs
class Options extends CustomType {
  constructor(strip_frontmatter, footnotes, heading_ids, tables, tasklists, emojis, autolinks) {
    super();
    this.strip_frontmatter = strip_frontmatter;
    this.footnotes = footnotes;
    this.heading_ids = heading_ids;
    this.tables = tables;
    this.tasklists = tasklists;
    this.emojis = emojis;
    this.autolinks = autolinks;
  }
}
class Document extends CustomType {
  constructor(options, blocks, links, footnotes) {
    super();
    this.options = options;
    this.blocks = blocks;
    this.links = links;
    this.footnotes = footnotes;
  }
}
class BlockQuote extends CustomType {
  constructor(blocks) {
    super();
    this.blocks = blocks;
  }
}
class BulletList extends CustomType {
  constructor(pack, items) {
    super();
    this.pack = pack;
    this.items = items;
  }
}
class Code extends CustomType {
  constructor(lang, text4) {
    super();
    this.lang = lang;
    this.text = text4;
  }
}
class Empty2 extends CustomType {
}
var Block$Empty$const = new Empty2;
class Heading extends CustomType {
  constructor(level, id2, raw, inlines) {
    super();
    this.level = level;
    this.id = id2;
    this.raw = raw;
    this.inlines = inlines;
  }
}
class HtmlBlock extends CustomType {
  constructor(raw) {
    super();
    this.raw = raw;
  }
}
class Newline extends CustomType {
}
var Block$Newline$const = new Newline;
class OrderedList extends CustomType {
  constructor(pack, items, start5) {
    super();
    this.pack = pack;
    this.items = items;
    this.start = start5;
  }
}
class Paragraph extends CustomType {
  constructor(raw, inlines) {
    super();
    this.raw = raw;
    this.inlines = inlines;
  }
}
class Table extends CustomType {
  constructor(header, rows) {
    super();
    this.header = header;
    this.rows = rows;
  }
}
class ThematicBreak extends CustomType {
}
var Block$ThematicBreak$const = new ThematicBreak;
class THead extends CustomType {
  constructor(align, raw, inlines) {
    super();
    this.align = align;
    this.raw = raw;
    this.inlines = inlines;
  }
}
class Left extends CustomType {
}
var Alignment$Left$const = new Left;
class Right extends CustomType {
}
var Alignment$Right$const = new Right;
class Center extends CustomType {
}
var Alignment$Center$const = new Center;
class Cell extends CustomType {
  constructor(raw, inlines) {
    super();
    this.raw = raw;
    this.inlines = inlines;
  }
}
class Autolink extends CustomType {
  constructor(uri, text4) {
    super();
    this.uri = uri;
    this.text = text4;
  }
}
class CodeSpan extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class EmailAutolink extends CustomType {
  constructor(mail) {
    super();
    this.mail = mail;
  }
}
class Emphasis extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Footnote extends CustomType {
  constructor(num, label) {
    super();
    this.num = num;
    this.label = label;
  }
}
class FullImage extends CustomType {
  constructor(text4, data) {
    super();
    this.text = text4;
    this.data = data;
  }
}
class FullLink extends CustomType {
  constructor(text4, data) {
    super();
    this.text = text4;
    this.data = data;
  }
}
class HardBreak extends CustomType {
}
var Inline$HardBreak$const = new HardBreak;
class Highlight extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class InlineFootnote extends CustomType {
  constructor(num, text4) {
    super();
    this.num = num;
    this.text = text4;
  }
}
class InlineHtml extends CustomType {
  constructor(tag, attrs, children) {
    super();
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
  }
}
class RawHtml extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class RefImage extends CustomType {
  constructor(text4, label) {
    super();
    this.text = text4;
    this.label = label;
  }
}
class RefLink extends CustomType {
  constructor(text4, label) {
    super();
    this.text = text4;
    this.label = label;
  }
}
class SoftBreak extends CustomType {
}
var Inline$SoftBreak$const = new SoftBreak;
class Strikethrough extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Strong extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Text2 extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Checkbox extends CustomType {
  constructor(checked2) {
    super();
    this.checked = checked2;
  }
}
class Delim extends CustomType {
  constructor(style2, len, can_open, can_close) {
    super();
    this.style = style2;
    this.len = len;
    this.can_open = can_open;
    this.can_close = can_close;
  }
}
class Loose extends CustomType {
}
var ListPack$Loose$const = new Loose;
class Tight extends CustomType {
}
var ListPack$Tight$const = new Tight;
class ListItem extends CustomType {
  constructor(blocks, ends_with_blank, contains_blank) {
    super();
    this.blocks = blocks;
    this.ends_with_blank = ends_with_blank;
    this.contains_blank = contains_blank;
  }
}
class LinkData extends CustomType {
  constructor(dest, title2) {
    super();
    this.dest = dest;
    this.title = title2;
  }
}
class FootnoteData extends CustomType {
  constructor(num, blocks) {
    super();
    this.num = num;
    this.blocks = blocks;
  }
}
class Absolute extends CustomType {
  constructor(uri) {
    super();
    this.uri = uri;
  }
}
class Relative extends CustomType {
  constructor(uri) {
    super();
    this.uri = uri;
  }
}
class Anchor extends CustomType {
  constructor(id2) {
    super();
    this.id = id2;
  }
}
function new$6(options) {
  return new Document(options, List$Empty$const, make(), make());
}
function new_destination(uri) {
  if (uri.charCodeAt(0) === 35) {
    let anchor = uri.slice(1);
    return new Anchor(anchor);
  } else {
    let $ = contains_string(uri, ":");
    if ($) {
      return new Absolute(uri);
    } else {
      return new Relative(uri);
    }
  }
}

// build/dev/javascript/casefold/casefold_ffi.js
function casefold(s) {
  return s.toLowerCase().toUpperCase().toLowerCase();
}
// build/dev/javascript/casefold/casefold.mjs
var ascii_lowercase = "abcdefghijklmnopqrstuvwxyz";
var ascii_uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var ascii_letters = ascii_lowercase + ascii_uppercase;
var digits = "0123456789";
var ascii_punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~.";
var ascii_whitespace = ` 	
\r\f\v`;
var ascii_printable = digits + ascii_letters + ascii_punctuation + ascii_whitespace;
// build/dev/javascript/gleam_regexp/gleam_regexp_ffi.mjs
function check(regex, string5) {
  regex.lastIndex = 0;
  return regex.test(string5);
}
function compile(pattern, options) {
  try {
    let flags = "gu";
    if (options.case_insensitive)
      flags += "i";
    if (options.multi_line)
      flags += "m";
    return new Ok(new RegExp(pattern, flags));
  } catch (error) {
    const number = (error.columnNumber || 0) | 0;
    return new Error(new CompileError(error.message, number));
  }
}
function scan(regex, string5) {
  regex.lastIndex = 0;
  const matches2 = Array.from(string5.matchAll(regex)).map((match) => {
    const content = match[0];
    return new Match(content, submatches(match.slice(1)));
  });
  return List.fromArray(matches2);
}
function replace3(regex, original_string, replacement) {
  regex.lastIndex = 0;
  return original_string.replaceAll(regex, replacement);
}
function submatches(groups) {
  const submatches2 = [];
  for (let n = groups.length - 1;n >= 0; n--) {
    if (groups[n]) {
      submatches2[n] = new Some(groups[n]);
      continue;
    }
    if (submatches2.length > 0) {
      submatches2[n] = new None;
    }
  }
  return List.fromArray(submatches2);
}

// build/dev/javascript/gleam_regexp/gleam/regexp.mjs
class Match extends CustomType {
  constructor(content, submatches2) {
    super();
    this.content = content;
    this.submatches = submatches2;
  }
}
class CompileError extends CustomType {
  constructor(error, byte_index) {
    super();
    this.error = error;
    this.byte_index = byte_index;
  }
}
class Options2 extends CustomType {
  constructor(case_insensitive, multi_line) {
    super();
    this.case_insensitive = case_insensitive;
    this.multi_line = multi_line;
  }
}
function compile2(pattern, options) {
  return compile(pattern, options);
}
function from_string(pattern) {
  return compile2(pattern, new Options2(false, false));
}
function check2(regexp, string5) {
  return check(regexp, string5);
}
function scan2(regexp, string5) {
  return scan(regexp, string5);
}

// build/dev/javascript/mork/mork/internal/util.mjs
var FILEPATH = "src\\mork\\internal\\util.gleam";
function check3(cond, yes, nope) {
  if (cond) {
    return yes;
  } else {
    return nope;
  }
}
function do_expand_tabs_indent(loop$s, loop$col) {
  while (true) {
    let s = loop$s;
    let col = loop$col;
    let $ = s.charCodeAt(0);
    if (s.startsWith("    ")) {
      let rest = s.slice(4);
      loop$s = rest;
      loop$col = col + 4;
    } else if (s.startsWith("   ")) {
      let rest = s.slice(3);
      loop$s = rest;
      loop$col = col + 3;
    } else if (s.startsWith("  ")) {
      let rest = s.slice(2);
      loop$s = rest;
      loop$col = col + 2;
    } else if ($ === 32) {
      let rest = s.slice(1);
      loop$s = rest;
      loop$col = col + 1;
    } else if ($ === 9) {
      let rest = s.slice(1);
      loop$s = rest;
      loop$col = col + (4 - col % 4);
    } else {
      return [s, col];
    }
  }
}
function expand_tabs_indent(s) {
  let $ = do_expand_tabs_indent(s, 0);
  let body = $[0];
  let indent = $[1];
  if (indent === 0) {
    return [body, indent];
  } else {
    return [repeat(" ", indent) + body, indent];
  }
}
function expand_tabs_blockquote(loop$s, loop$col) {
  while (true) {
    let s = loop$s;
    let col = loop$col;
    let $ = s.charCodeAt(0);
    if ($ === 32) {
      let rest = s.slice(1);
      loop$s = rest;
      loop$col = col + 1;
    } else if ($ === 62) {
      let rest = s.slice(1);
      let $1 = do_expand_tabs_indent(rest, col + 1);
      let body = $1[0];
      let indent = $1[1];
      return repeat(" ", indent - col - 1) + body;
    } else if ($ === 9) {
      let rest = s.slice(1);
      loop$s = rest;
      loop$col = col + (4 - col % 4);
    } else {
      return repeat(" ", col + 1) + s;
    }
  }
}
function expand_tabs_postmarker(loop$rest, loop$col, loop$acc) {
  while (true) {
    let rest = loop$rest;
    let col = loop$col;
    let acc = loop$acc;
    let $ = rest.charCodeAt(0);
    if ($ === 9) {
      let rest$1 = rest.slice(1);
      let newcol = col + (4 - col % 4);
      loop$rest = rest$1;
      loop$col = newcol;
      loop$acc = acc + repeat(" ", newcol - col);
    } else if ($ === 32) {
      let ch = " ";
      let rest$1 = rest.slice(1);
      loop$rest = rest$1;
      loop$col = col + 1;
      loop$acc = acc + ch;
    } else {
      return acc + rest;
    }
  }
}
function expand_tabs_premarker(rest, marker, col, acc) {
  return lazy_guard(starts_with(rest, marker), () => {
    return expand_tabs_postmarker(drop_start(rest, 1), col + 1, acc + marker);
  }, () => {
    let $ = rest.charCodeAt(0);
    if ($ === 9) {
      let rest$1 = rest.slice(1);
      let newcol = col + (4 - col % 4);
      return expand_tabs_premarker(rest$1, marker, newcol, acc + repeat(" ", newcol - col));
    } else if ($ === 48) {
      let ch = "0";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 49) {
      let ch = "1";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 50) {
      let ch = "2";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 51) {
      let ch = "3";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 52) {
      let ch = "4";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 53) {
      let ch = "5";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 54) {
      let ch = "6";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 55) {
      let ch = "7";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 56) {
      let ch = "8";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 57) {
      let ch = "9";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if ($ === 32) {
      let ch = " ";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else {
      return acc + rest;
    }
  });
}
function expand_tabs_listitem(s, marker) {
  return expand_tabs_premarker(s, marker, 0, "");
}
function do_find_indent(loop$line, loop$depth) {
  while (true) {
    let line = loop$line;
    let depth = loop$depth;
    let $ = line.charCodeAt(0);
    if ($ === 32) {
      let rest = line.slice(1);
      loop$line = rest;
      loop$depth = depth + 1;
    } else if ($ === 9) {
      let rest = line.slice(1);
      loop$line = rest;
      loop$depth = depth + (4 - depth % 4);
    } else {
      return depth;
    }
  }
}
function find_indent(line) {
  return do_find_indent(line, 0);
}
function has_ordinal_marker(loop$line, loop$marker) {
  while (true) {
    let line = loop$line;
    let marker = loop$marker;
    let $ = line.charCodeAt(0);
    if ($ === 48) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 49) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 50) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 51) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 52) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 53) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 54) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 55) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 56) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if ($ === 57) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else {
      return starts_with(line, marker);
    }
  }
}
function drop_3_spaces(line) {
  if (line.startsWith("   ")) {
    let line$1 = line.slice(3);
    return line$1;
  } else if (line.startsWith("  ")) {
    let line$1 = line.slice(2);
    return line$1;
  } else if (line.charCodeAt(0) === 32) {
    let line$1 = line.slice(1);
    return line$1;
  } else {
    let line$1 = line;
    return line$1;
  }
}
function has_list_marker(line, marker) {
  let line$1 = drop_3_spaces(line);
  if (marker === "-") {
    let ch = marker;
    return starts_with(line$1, ch);
  } else if (marker === "+") {
    let ch = marker;
    return starts_with(line$1, ch);
  } else if (marker === "*") {
    let ch = marker;
    return starts_with(line$1, ch);
  } else {
    let $ = line$1.charCodeAt(0);
    if ($ === 48) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 49) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 50) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 51) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 52) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 53) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 54) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 55) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 56) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if ($ === 57) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else {
      return false;
    }
  }
}
function drop_indent(line, count2) {
  let $ = do_expand_tabs_indent(line, 0);
  let body = $[0];
  let indent = $[1];
  let indent$1 = max(indent - count2, 0);
  return repeat(" ", indent$1) + body;
}
function drop_blockquote_marker(line) {
  let $ = expand_tabs_blockquote(line, 0);
  if ($.charCodeAt(0) === 32) {
    let line$1 = $.slice(1);
    return line$1;
  } else {
    return $;
  }
}
function has_blockquote_marker(line) {
  if (line.charCodeAt(0) === 62) {
    return true;
  } else if (line.startsWith(" >")) {
    return true;
  } else if (line.startsWith("  >")) {
    return true;
  } else if (line.startsWith("   >")) {
    return true;
  } else {
    return false;
  }
}
function drop_all_blockquote_markers(loop$line) {
  while (true) {
    let line = loop$line;
    let $ = has_blockquote_marker(line);
    if ($) {
      let _pipe = line;
      let _pipe$1 = drop_blockquote_marker(_pipe);
      loop$line = _pipe$1;
    } else {
      return line;
    }
  }
}
function clear_marker(line, marker, indent) {
  let line$1 = expand_tabs_listitem(line, marker);
  return repeat(" ", indent) + drop_start(line$1, indent);
}
function count_spaces(loop$line, loop$acc) {
  while (true) {
    let line = loop$line;
    let acc = loop$acc;
    if (line.charCodeAt(0) === 32) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$acc = acc + 1;
    } else {
      return acc;
    }
  }
}
function collapse_interior_space(s) {
  let $ = from_string("\\s+");
  let re;
  if ($ instanceof Ok) {
    re = $[0];
  } else {
    throw makeError("let_assert", FILEPATH, "mork/internal/util", 234, "collapse_interior_space", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 5934,
      end: 5980,
      pattern_start: 5945,
      pattern_end: 5951
    });
  }
  return replace3(re, s, " ");
}
function do_gobble_link_label(loop$sp, loop$rest, loop$acc) {
  while (true) {
    let sp = loop$sp;
    let rest = loop$rest;
    let acc = loop$acc;
    let $ = split3(sp, rest);
    let l = $[0];
    let s = $[1];
    let r = $[2];
    let body = acc + l;
    if (s === "") {
      return [body, ""];
    } else if (s === "\\") {
      let $1 = r.charCodeAt(0);
      if ($1 === 92) {
        let rest$1 = r.slice(1);
        loop$sp = sp;
        loop$rest = rest$1;
        loop$acc = body + "\\";
      } else if ($1 === 93) {
        let rest$1 = r.slice(1);
        loop$sp = sp;
        loop$rest = rest$1;
        loop$acc = body + "]";
      } else if ($1 === 91) {
        let rest$1 = r.slice(1);
        loop$sp = sp;
        loop$rest = rest$1;
        loop$acc = body + "[";
      } else {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = body + "\\";
      }
    } else if (s === "[") {
      return ["", acc + rest];
    } else if (s === "]") {
      return [body, r];
    } else {
      throw makeError("panic", FILEPATH, "mork/internal/util", 262, "do_gobble_link_label", "bad splitter, bad", {});
    }
  }
}
function gobble_link_label(sp, rest) {
  let $ = do_gobble_link_label(sp, rest, "");
  let label = $[0];
  let rest$1 = $[1];
  let label$1 = collapse_interior_space(label);
  return [label$1, rest$1];
}
function gobble_hspace(loop$in) {
  while (true) {
    let in$ = loop$in;
    let $ = in$.charCodeAt(0);
    if ($ === 32) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
    } else if ($ === 9) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
    } else {
      return in$;
    }
  }
}
function do_parse_link_dest(loop$sp, loop$in, loop$acc, loop$stack, loop$value) {
  while (true) {
    let sp = loop$sp;
    let in$ = loop$in;
    let acc = loop$acc;
    let stack = loop$stack;
    let value = loop$value;
    let $ = split3(sp, in$);
    let l = $[0];
    let s = $[1];
    let r = $[2];
    let body = acc + l;
    if (s === "") {
      if (stack instanceof Empty) {
        if (body === "") {
          return new Error(undefined);
        } else {
          return value(new_destination(body), r);
        }
      } else {
        return new Error(undefined);
      }
    } else if (s === `
`) {
      return value(new_destination(body), r);
    } else if (s === "\\") {
      let $1 = r.charCodeAt(0);
      if ($1 === 33) {
        let ch = "!";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 35) {
        let ch = "#";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 36) {
        let ch = "$";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 37) {
        let ch = "%";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 38) {
        let ch = "&";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 39) {
        let ch = "'";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 40) {
        let ch = "(";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 41) {
        let ch = ")";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 42) {
        let ch = "*";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 43) {
        let ch = "+";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 44) {
        let ch = ",";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 45) {
        let ch = "-";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 46) {
        let ch = ".";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 47) {
        let ch = "/";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 58) {
        let ch = ":";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 59) {
        let ch = ";";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 61) {
        let ch = "=";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 63) {
        let ch = "?";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 64) {
        let ch = "@";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 91) {
        let ch = "[";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 92) {
        let ch = "\\";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 93) {
        let ch = "]";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 94) {
        let ch = "^";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 95) {
        let ch = "_";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 96) {
        let ch = "`";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 123) {
        let ch = "{";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 124) {
        let ch = "|";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 125) {
        let ch = "}";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 126) {
        let ch = "~";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 34) {
        let ch = '"';
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 60) {
        let ch = "<";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 62) {
        let ch = ">";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value;
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$acc = body + "\\";
        loop$stack = stack;
        loop$value = value;
      }
    } else if (s === ")") {
      if (stack instanceof Empty) {
        return value(new_destination(body), ")" + r);
      } else {
        let $1 = stack.head;
        if ($1 === ")") {
          let rest = stack.tail;
          loop$sp = sp;
          loop$in = r;
          loop$acc = body + ")";
          loop$stack = rest;
          loop$value = value;
        } else {
          return new Error(undefined);
        }
      }
    } else if (s === "(") {
      loop$sp = sp;
      loop$in = r;
      loop$acc = body + "(";
      loop$stack = prepend(")", stack);
      loop$value = value;
    } else if (s === " ") {
      if (stack instanceof Empty) {
        return value(new_destination(body), r);
      } else {
        return new Error(undefined);
      }
    } else if (s === "\t") {
      if (stack instanceof Empty) {
        return value(new_destination(body), r);
      } else {
        return new Error(undefined);
      }
    } else {
      throw makeError("panic", FILEPATH, "mork/internal/util", 402, "do_parse_link_dest", "missing case in splitter", {});
    }
  }
}
function try_pop(ch, in$, value) {
  let $ = in$.charCodeAt(0);
  if ($ === 60) {
    let first2 = "<";
    if (ch === first2) {
      let rest = in$.slice(1);
      return value(rest);
    } else {
      return new Error(undefined);
    }
  } else if ($ === 62) {
    let first2 = ">";
    if (ch === first2) {
      let rest = in$.slice(1);
      return value(rest);
    } else {
      return new Error(undefined);
    }
  } else if ($ === 91) {
    let first2 = "[";
    if (ch === first2) {
      let rest = in$.slice(1);
      return value(rest);
    } else {
      return new Error(undefined);
    }
  } else if ($ === 93) {
    let first2 = "]";
    if (ch === first2) {
      let rest = in$.slice(1);
      return value(rest);
    } else {
      return new Error(undefined);
    }
  } else {
    return new Error(undefined);
  }
}
function do_parse_link_dest_tag(loop$sp, loop$in, loop$acc, loop$value) {
  while (true) {
    let sp = loop$sp;
    let in$ = loop$in;
    let acc = loop$acc;
    let value = loop$value;
    let $ = split3(sp, in$);
    let l = $[0];
    let s = $[1];
    let r = $[2];
    if (s === "") {
      return new Error(undefined);
    } else if (s === "\\") {
      let $1 = pop_grapheme(r);
      if ($1 instanceof Ok) {
        let ch = $1[0][0];
        let rest = $1[0][1];
        loop$sp = sp;
        loop$in = rest;
        loop$acc = acc + ch;
        loop$value = value;
      } else {
        loop$sp = sp;
        loop$in = "";
        loop$acc = acc + "\\";
        loop$value = value;
      }
    } else if (s === `
`) {
      return new Error(undefined);
    } else if (s === "<") {
      return new Error(undefined);
    } else if (s === ">") {
      return value(new_destination(acc + l), s + r);
    } else {
      throw makeError("panic", FILEPATH, "mork/internal/util", 438, "do_parse_link_dest_tag", "`panic` expression evaluated.", {});
    }
  }
}
function parse_link_dest(in$, sp_link_dest, sp_link_dest_tag, value) {
  let $ = starts_with(in$, "<");
  if ($) {
    return try_pop("<", in$, (in$2) => {
      return do_parse_link_dest_tag(sp_link_dest_tag, in$2, "", (dest, in$3) => {
        return try_pop(">", in$3, (in$4) => {
          if (in$4 === " ") {
            return value(dest, in$4);
          } else if (in$4 === "\t") {
            return value(dest, in$4);
          } else if (in$4 === "\r") {
            return value(dest, in$4);
          } else if (in$4 === `
`) {
            return value(dest, in$4);
          } else if (in$4 === "") {
            return value(dest, in$4);
          } else if (in$4 === ")") {
            return value(dest, in$4);
          } else if (in$4 === "]") {
            return value(dest, in$4);
          } else {
            return new Error(undefined);
          }
        });
      });
    });
  } else {
    let in$1 = gobble_hspace(in$);
    return do_parse_link_dest(sp_link_dest, in$1, "", List$Empty$const, (dest, in$2) => {
      return value(dest, in$2);
    });
  }
}
function is_blank(loop$line) {
  while (true) {
    let line = loop$line;
    let $ = line.charCodeAt(0);
    if ($ === 32) {
      let line$1 = line.slice(1);
      loop$line = line$1;
    } else if ($ === 9) {
      let line$1 = line.slice(1);
      loop$line = line$1;
    } else if (line === "") {
      return true;
    } else {
      return false;
    }
  }
}
function is_blankn(loop$line) {
  while (true) {
    let line = loop$line;
    let $ = line.charCodeAt(0);
    if ($ === 32) {
      let line$1 = line.slice(1);
      loop$line = line$1;
    } else if ($ === 9) {
      let line$1 = line.slice(1);
      loop$line = line$1;
    } else if (line === "") {
      return true;
    } else if ($ === 10) {
      return true;
    } else {
      return false;
    }
  }
}
function do_parse_link_title(loop$sp, loop$in, loop$brace, loop$acc, loop$stack, loop$value) {
  while (true) {
    let sp = loop$sp;
    let in$ = loop$in;
    let brace = loop$brace;
    let acc = loop$acc;
    let stack = loop$stack;
    let value = loop$value;
    let $ = split3(sp, in$);
    let l = $[0];
    let s = $[1];
    let r = $[2];
    if (s === "\\") {
      let $1 = r.charCodeAt(0);
      if ($1 === 33) {
        let ch = "!";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 35) {
        let ch = "#";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 36) {
        let ch = "$";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 37) {
        let ch = "%";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 38) {
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + "&amp;";
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 39) {
        let ch = "'";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 40) {
        let ch = "(";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 41) {
        let ch = ")";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 42) {
        let ch = "*";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 43) {
        let ch = "+";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 44) {
        let ch = ",";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 45) {
        let ch = "-";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 46) {
        let ch = ".";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 47) {
        let ch = "/";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 58) {
        let ch = ":";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 59) {
        let ch = ";";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 60) {
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + "&lt;";
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 61) {
        let ch = "=";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 62) {
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + "&gt;";
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 63) {
        let ch = "?";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 64) {
        let ch = "@";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 91) {
        let ch = "[";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 34) {
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + "&quot;";
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 92) {
        let ch = "\\";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 93) {
        let ch = "]";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 94) {
        let ch = "^";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 95) {
        let ch = "_";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 96) {
        let ch = "`";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 123) {
        let ch = "{";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 124) {
        let ch = "|";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 125) {
        let ch = "}";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else if ($1 === 126) {
        let ch = "~";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value;
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + s;
        loop$stack = stack;
        loop$value = value;
      }
    } else if (s === '"') {
      let $1 = brace === '"';
      if ($1) {
        return value(new Some(acc + l), r);
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + '"';
        loop$stack = stack;
        loop$value = value;
      }
    } else if (s === "'") {
      let $1 = brace === "'";
      if ($1) {
        return value(new Some(acc + l), r);
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + "'";
        loop$stack = stack;
        loop$value = value;
      }
    } else if (s === ")") {
      if (stack instanceof Empty) {
        return value(new Some(acc + l), r);
      } else {
        let stack$1 = stack.tail;
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + ")";
        loop$stack = stack$1;
        loop$value = value;
      }
    } else if (s === "(") {
      loop$sp = sp;
      loop$in = r;
      loop$brace = brace;
      loop$acc = acc + l + "(";
      loop$stack = prepend(")", stack);
      loop$value = value;
    } else if (s === `
`) {
      let $1 = r !== "" && is_blankn(r);
      if ($1) {
        return new Error(undefined);
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + `
`;
        loop$stack = stack;
        loop$value = value;
      }
    } else {
      return new Error(undefined);
    }
  }
}
function parse_link_title(in$, sp_link_title, value) {
  let $ = in$.charCodeAt(0);
  if ($ === 41) {
    return value(Option$None$const, in$);
  } else if ($ === 34) {
    let ch = '"';
    let rest = in$.slice(1);
    return do_parse_link_title(sp_link_title, rest, ch, "", List$Empty$const, value);
  } else if ($ === 39) {
    let ch = "'";
    let rest = in$.slice(1);
    return do_parse_link_title(sp_link_title, rest, ch, "", List$Empty$const, value);
  } else if ($ === 40) {
    let ch = "(";
    let rest = in$.slice(1);
    return do_parse_link_title(sp_link_title, rest, ch, "", List$Empty$const, value);
  } else {
    return new Error(undefined);
  }
}
function parse_ordinal(ord) {
  let ordlen = string_length(ord);
  return guard(ordlen < 1 || ordlen > 9, new Error(undefined), () => {
    let _pipe = ord;
    let _pipe$1 = parse_int(_pipe);
    return try$(_pipe$1, (ord2) => {
      return guard(ord2 < 0, new Error(undefined), () => {
        return new Ok(ord2);
      });
    });
  });
}
function do_countdrop_spaces(loop$line, loop$spaces, loop$count) {
  while (true) {
    let line = loop$line;
    let spaces = loop$spaces;
    let count2 = loop$count;
    let $ = spaces < 1;
    if ($) {
      return [count2, line];
    } else {
      if (line.charCodeAt(0) === 32) {
        let rest = line.slice(1);
        loop$line = rest;
        loop$spaces = spaces - 1;
        loop$count = count2 + 1;
      } else {
        return [count2, line];
      }
    }
  }
}
function countdrop_3_spaces(line) {
  return do_countdrop_spaces(line, 3, 0);
}
function is_empty_list(sp_dot_paren, line) {
  let $ = countdrop_3_spaces(line);
  let line$1 = $[1];
  let $1 = line$1.charCodeAt(0);
  if ($1 === 45) {
    let rest = line$1.slice(1);
    return is_blank(rest);
  } else if ($1 === 43) {
    let rest = line$1.slice(1);
    return is_blank(rest);
  } else if ($1 === 42) {
    let rest = line$1.slice(1);
    return is_blank(rest);
  } else {
    let $2 = split3(sp_dot_paren, line$1);
    let ord = $2[0];
    let marker = $2[1];
    let rest = $2[2];
    return guard(marker !== "." && marker !== ")", false, () => {
      let $3 = parse_ordinal(ord);
      if ($3 instanceof Ok) {
        return is_blank(rest);
      } else {
        return false;
      }
    });
  }
}
function calc_post_item_width(idx, post) {
  let _block;
  let $ = post.charCodeAt(0);
  if (post === "") {
    _block = 1;
  } else if ($ === 32) {
    let $1 = expand_tabs_indent(post);
    let expanded = $1[0];
    let $2 = count_spaces(expanded, 0);
    {
      let sp = $2;
      if (sp > 4) {
        _block = 1;
      } else {
        _block = $2;
      }
    }
  } else if ($ === 9) {
    let $1 = expand_tabs_indent(post);
    let expanded = $1[0];
    let $2 = count_spaces(expanded, 0);
    {
      let sp = $2;
      if (sp > 4) {
        _block = 1;
      } else {
        _block = $2;
      }
    }
  } else {
    _block = 0;
  }
  let postcount = _block;
  let _block$1;
  if (postcount === 0) {
    _block$1 = postcount;
  } else {
    let n = postcount;
    _block$1 = idx + n;
  }
  let ret = _block$1;
  return ret;
}
function parse_bullet_item(line) {
  let $ = countdrop_3_spaces(line);
  let idx = $[0];
  let line$1 = $[1];
  let $1 = line$1.charCodeAt(0);
  if ($1 === 45) {
    let marker = "-";
    let rest = line$1.slice(1);
    let $2 = is_blank(rest);
    if ($2) {
      return new Ok([marker, idx + 2]);
    } else {
      let indent = calc_post_item_width(idx + 1, rest);
      return guard(indent === 0, new Error(undefined), () => {
        return new Ok([marker, indent]);
      });
    }
  } else if ($1 === 43) {
    let marker = "+";
    let rest = line$1.slice(1);
    let $2 = is_blank(rest);
    if ($2) {
      return new Ok([marker, idx + 2]);
    } else {
      let indent = calc_post_item_width(idx + 1, rest);
      return guard(indent === 0, new Error(undefined), () => {
        return new Ok([marker, indent]);
      });
    }
  } else if ($1 === 42) {
    let marker = "*";
    let rest = line$1.slice(1);
    let $2 = is_blank(rest);
    if ($2) {
      return new Ok([marker, idx + 2]);
    } else {
      let indent = calc_post_item_width(idx + 1, rest);
      return guard(indent === 0, new Error(undefined), () => {
        return new Ok([marker, indent]);
      });
    }
  } else {
    return new Error(undefined);
  }
}
function parse_ordinal_item(sp_dot_paren, line) {
  let $ = countdrop_3_spaces(line);
  let idx = $[0];
  let line$1 = $[1];
  let $1 = split3(sp_dot_paren, line$1);
  let ord = $1[0];
  let marker = $1[1];
  let rest = $1[2];
  return guard(marker !== "." && marker !== ")", new Error(undefined), () => {
    let ordlen = string_length(ord);
    return guard(ordlen < 1 || ordlen > 9, new Error(undefined), () => {
      let _pipe = ord;
      let _pipe$1 = parse_int(_pipe);
      return try$(_pipe$1, (ord2) => {
        return guard(ord2 < 0, new Error(undefined), () => {
          let indent = calc_post_item_width(idx + ordlen + 1, rest);
          return guard(indent === 0, new Error(undefined), () => {
            return new Ok([marker, indent, ord2]);
          });
        });
      });
    });
  });
}
function take_star_run(loop$in, loop$acc) {
  while (true) {
    let in$ = loop$in;
    let acc = loop$acc;
    if (in$.charCodeAt(0) === 42) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
      loop$acc = acc + 1;
    } else {
      return [acc, in$];
    }
  }
}
function take_unds_run(loop$in, loop$acc) {
  while (true) {
    let in$ = loop$in;
    let acc = loop$acc;
    if (in$.charCodeAt(0) === 95) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
      loop$acc = acc + 1;
    } else {
      return [acc, in$];
    }
  }
}
function take_quot_run(loop$in, loop$acc) {
  while (true) {
    let in$ = loop$in;
    let acc = loop$acc;
    if (in$.charCodeAt(0) === 96) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
      loop$acc = acc + 1;
    } else {
      return [acc, in$];
    }
  }
}
function take_tilde_run(loop$in, loop$acc) {
  while (true) {
    let in$ = loop$in;
    let acc = loop$acc;
    if (in$.charCodeAt(0) === 126) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
      loop$acc = acc + 1;
    } else {
      return [acc, in$];
    }
  }
}
function take_fence_run(in$, fence) {
  if (fence === "`") {
    return take_quot_run(in$, 1);
  } else if (fence === "~") {
    return take_tilde_run(in$, 1);
  } else {
    throw makeError("panic", FILEPATH, "mork/internal/util", 746, "take_fence_run", "take_fence_run bad fence: " + fence, {});
  }
}
function hr_eat_and_count_unds(loop$line, loop$count) {
  while (true) {
    let line = loop$line;
    let count2 = loop$count;
    let $ = line.charCodeAt(0);
    if ($ === 95) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2 + 1;
    } else if ($ === 32) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if ($ === 9) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line === "") {
      return new Ok(count2);
    } else {
      return new Error(undefined);
    }
  }
}
function hr_eat_and_count_dash(loop$line, loop$count) {
  while (true) {
    let line = loop$line;
    let count2 = loop$count;
    let $ = line.charCodeAt(0);
    if ($ === 45) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2 + 1;
    } else if ($ === 32) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if ($ === 9) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line === "") {
      return new Ok(count2);
    } else {
      return new Error(undefined);
    }
  }
}
function hr_eat_and_count_star(loop$line, loop$count) {
  while (true) {
    let line = loop$line;
    let count2 = loop$count;
    let $ = line.charCodeAt(0);
    if ($ === 42) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2 + 1;
    } else if ($ === 32) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if ($ === 9) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line === "") {
      return new Ok(count2);
    } else {
      return new Error(undefined);
    }
  }
}
function match_hr(line) {
  let line$1 = drop_3_spaces(line);
  let _block;
  let $ = line$1.charCodeAt(0);
  if ($ === 42) {
    let line$2 = line$1.slice(1);
    _block = hr_eat_and_count_star(line$2, 1);
  } else if ($ === 45) {
    let line$2 = line$1.slice(1);
    _block = hr_eat_and_count_dash(line$2, 1);
  } else if ($ === 95) {
    let line$2 = line$1.slice(1);
    _block = hr_eat_and_count_unds(line$2, 1);
  } else {
    _block = new Error(undefined);
  }
  let count2 = _block;
  return unwrap2(count2, 0) > 2;
}
function isalnum(ch) {
  let $ = toBitArray([stringBits(ch)]);
  if ($.bitSize === 8) {
    let ch$1 = $.byteAt(0);
    return ch$1 >= 48 && ch$1 <= 57 || ch$1 >= 65 && ch$1 <= 90 || ch$1 >= 97 && ch$1 <= 122;
  } else {
    return false;
  }
}

// build/dev/javascript/mork/mork/internal/cache.mjs
var FILEPATH2 = "src\\mork\\internal\\cache.gleam";

class Cache2 extends CustomType {
  constructor(atx_heading_empty, atx_heading_tail, atx_heading_id, autolink, email_autolink, setext_h1, setext_h2, open_tag, close_tag, is_html_block_start, is_paragraph_continuation_text, is_a_html_tag, starts_with_ws, ends_with_ws, starts_with_p, ends_with_p, html_1_start, html_1_end, html_2_start, html_3_start, sp_hspace, sp_line, sp_scheme, sp_semi, sp_question, sp_escape, sp_html_escape, sp_dot_paren, sp_tag, sp_link_text, sp_link_dest, sp_inline, sp_link_label, sp_link_title, sp_link_dest_tag, sp_1backquote, sp_pipe) {
    super();
    this.atx_heading_empty = atx_heading_empty;
    this.atx_heading_tail = atx_heading_tail;
    this.atx_heading_id = atx_heading_id;
    this.autolink = autolink;
    this.email_autolink = email_autolink;
    this.setext_h1 = setext_h1;
    this.setext_h2 = setext_h2;
    this.open_tag = open_tag;
    this.close_tag = close_tag;
    this.is_html_block_start = is_html_block_start;
    this.is_paragraph_continuation_text = is_paragraph_continuation_text;
    this.is_a_html_tag = is_a_html_tag;
    this.starts_with_ws = starts_with_ws;
    this.ends_with_ws = ends_with_ws;
    this.starts_with_p = starts_with_p;
    this.ends_with_p = ends_with_p;
    this.html_1_start = html_1_start;
    this.html_1_end = html_1_end;
    this.html_2_start = html_2_start;
    this.html_3_start = html_3_start;
    this.sp_hspace = sp_hspace;
    this.sp_line = sp_line;
    this.sp_scheme = sp_scheme;
    this.sp_semi = sp_semi;
    this.sp_question = sp_question;
    this.sp_escape = sp_escape;
    this.sp_html_escape = sp_html_escape;
    this.sp_dot_paren = sp_dot_paren;
    this.sp_tag = sp_tag;
    this.sp_link_text = sp_link_text;
    this.sp_link_dest = sp_link_dest;
    this.sp_inline = sp_inline;
    this.sp_link_label = sp_link_label;
    this.sp_link_title = sp_link_title;
    this.sp_link_dest_tag = sp_link_dest_tag;
    this.sp_1backquote = sp_1backquote;
    this.sp_pipe = sp_pipe;
  }
}
var doublequoted_value = '"[^"]*"';
var singlequoted_value = "'[^']*'";
var unquoted_value = "[^\"'=<>`\\x00-\\x20]+";
var attribute_value = "(?:" + unquoted_value + "|" + singlequoted_value + "|" + doublequoted_value + ")";
var attribute_value_spec = "(?:" + "\\s*=" + "\\s*" + attribute_value + ")";
var attribute_name = "[a-zA-Z_:][a-zA-Z0-9:._-]*";
var attribute3 = "(?:" + "\\s+" + attribute_name + attribute_value_spec + "?)";
var tag_name = "[A-Za-z][A-Za-z0-9-]*";
var punctuation = "[!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\\\^_`{|}~\\p{P}\\p{S}]";
function re_from_string(re) {
  let $ = from_string(re);
  let re$1;
  if ($ instanceof Ok) {
    re$1 = $[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 152, "re_from_string", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 4971,
      end: 5013,
      pattern_start: 4982,
      pattern_end: 4988
    });
  }
  return re$1;
}
function re_from_string_i(re) {
  let opt = new Options2(true, false);
  let $ = compile2(re, opt);
  let re$1;
  if ($ instanceof Ok) {
    re$1 = $[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 158, "re_from_string_i", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 5128,
      end: 5171,
      pattern_start: 5139,
      pattern_end: 5145
    });
  }
  return re$1;
}
function make_is_paragraph_continuation_text(is_html_block, sp_dot_paren) {
  let $ = from_string("^(\\*[ \\t]*){3,}[ \\t\\*]*$");
  let re_hr_1;
  if ($ instanceof Ok) {
    re_hr_1 = $[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 239, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 7940,
      end: 8015,
      pattern_start: 7951,
      pattern_end: 7962
    });
  }
  let $1 = from_string("^(-[ \\t]*){3,}[ \\t-]*$");
  let re_hr_2;
  if ($1 instanceof Ok) {
    re_hr_2 = $1[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 240, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $1,
      start: 8018,
      end: 8089,
      pattern_start: 8029,
      pattern_end: 8040
    });
  }
  let $2 = from_string("^(_[ \\t]*){3,}[ \\t_]*$");
  let re_hr_3;
  if ($2 instanceof Ok) {
    re_hr_3 = $2[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 241, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $2,
      start: 8092,
      end: 8163,
      pattern_start: 8103,
      pattern_end: 8114
    });
  }
  let $3 = from_string("^([`]{3,}|[~]{3,})[ \\t]*(.*)$");
  let re_fenced;
  if ($3 instanceof Ok) {
    re_fenced = $3[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 242, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $3,
      start: 8166,
      end: 8249,
      pattern_start: 8177,
      pattern_end: 8190
    });
  }
  let $4 = from_string("^(#{1,6})[ \\t]+(.+)[ \\t]*#*$");
  let re_h_atx;
  if ($4 instanceof Ok) {
    re_h_atx = $4[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 244, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $4,
      start: 8252,
      end: 8330,
      pattern_start: 8263,
      pattern_end: 8275
    });
  }
  let $5 = from_string("^([-]|\\+|\\*)(?:[ ]|\\t)");
  let re_list_1;
  if ($5 instanceof Ok) {
    re_list_1 = $5[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 245, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $5,
      start: 8333,
      end: 8407,
      pattern_start: 8344,
      pattern_end: 8357
    });
  }
  return (line) => {
    if (line.startsWith("   ")) {
      let line$1 = line.slice(3);
      let $6 = is_blank(line$1) || check2(re_hr_1, line$1) || check2(re_hr_2, line$1) || check2(re_hr_3, line$1) || check2(re_fenced, line$1) || check2(re_list_1, line$1) || check2(re_h_atx, line$1) || is_html_block(line$1, false);
      if ($6) {
        return false;
      } else {
        let $7 = parse_ordinal_item(sp_dot_paren, line$1);
        if ($7 instanceof Ok) {
          let ord = $7[0][2];
          return ord !== 1;
        } else {
          return true;
        }
      }
    } else if (line.startsWith("  ")) {
      let line$1 = line.slice(2);
      let $6 = is_blank(line$1) || check2(re_hr_1, line$1) || check2(re_hr_2, line$1) || check2(re_hr_3, line$1) || check2(re_fenced, line$1) || check2(re_list_1, line$1) || check2(re_h_atx, line$1) || is_html_block(line$1, false);
      if ($6) {
        return false;
      } else {
        let $7 = parse_ordinal_item(sp_dot_paren, line$1);
        if ($7 instanceof Ok) {
          let ord = $7[0][2];
          return ord !== 1;
        } else {
          return true;
        }
      }
    } else if (line.charCodeAt(0) === 32) {
      let line$1 = line.slice(1);
      let $6 = is_blank(line$1) || check2(re_hr_1, line$1) || check2(re_hr_2, line$1) || check2(re_hr_3, line$1) || check2(re_fenced, line$1) || check2(re_list_1, line$1) || check2(re_h_atx, line$1) || is_html_block(line$1, false);
      if ($6) {
        return false;
      } else {
        let $7 = parse_ordinal_item(sp_dot_paren, line$1);
        if ($7 instanceof Ok) {
          let ord = $7[0][2];
          return ord !== 1;
        } else {
          return true;
        }
      }
    } else {
      let line$1 = line;
      let $6 = is_blank(line$1) || check2(re_hr_1, line$1) || check2(re_hr_2, line$1) || check2(re_hr_3, line$1) || check2(re_fenced, line$1) || check2(re_list_1, line$1) || check2(re_h_atx, line$1) || is_html_block(line$1, false);
      if ($6) {
        return false;
      } else {
        let $7 = parse_ordinal_item(sp_dot_paren, line$1);
        if ($7 instanceof Ok) {
          let ord = $7[0][2];
          return ord !== 1;
        } else {
          return true;
        }
      }
    }
  };
}
function make_is_html_block_start(is_a_html_tag) {
  let re2 = re_from_string("^[A-Za-z]");
  let re1 = re_from_string_i("^(?:pre|script|style|textarea)(?:(?:[ \\t>]$)|$)");
  let re3 = re_from_string_i("^\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:(?:[ \\t>])|$|\\/>)");
  return (line, inc_type_7) => {
    if (line.charCodeAt(0) === 60) {
      let line2 = line.slice(1);
      let $ = line2.charCodeAt(0);
      if ($ === 33) {
        let line2$1 = line2.slice(1);
        return starts_with(line2$1, "--") || starts_with(line2$1, "[CDATA[") || check2(re2, line2$1);
      } else if ($ === 63) {
        return true;
      } else {
        return check2(re1, line2) || check2(re3, line2) || (() => {
          if (inc_type_7) {
            return is_a_html_tag(line, true, false);
          } else {
            return inc_type_7;
          }
        })();
      }
    } else if (line.startsWith(" <")) {
      let line2 = line.slice(2);
      let $ = line2.charCodeAt(0);
      if ($ === 33) {
        let line2$1 = line2.slice(1);
        return starts_with(line2$1, "--") || starts_with(line2$1, "[CDATA[") || check2(re2, line2$1);
      } else if ($ === 63) {
        return true;
      } else {
        return check2(re1, line2) || check2(re3, line2) || (() => {
          if (inc_type_7) {
            return is_a_html_tag(line, true, false);
          } else {
            return inc_type_7;
          }
        })();
      }
    } else if (line.startsWith("  <")) {
      let line2 = line.slice(3);
      let $ = line2.charCodeAt(0);
      if ($ === 33) {
        let line2$1 = line2.slice(1);
        return starts_with(line2$1, "--") || starts_with(line2$1, "[CDATA[") || check2(re2, line2$1);
      } else if ($ === 63) {
        return true;
      } else {
        return check2(re1, line2) || check2(re3, line2) || (() => {
          if (inc_type_7) {
            return is_a_html_tag(line, true, false);
          } else {
            return inc_type_7;
          }
        })();
      }
    } else if (line.startsWith("   <")) {
      let line2 = line.slice(4);
      let $ = line2.charCodeAt(0);
      if ($ === 33) {
        let line2$1 = line2.slice(1);
        return starts_with(line2$1, "--") || starts_with(line2$1, "[CDATA[") || check2(re2, line2$1);
      } else if ($ === 63) {
        return true;
      } else {
        return check2(re1, line2) || check2(re3, line2) || (() => {
          if (inc_type_7) {
            return is_a_html_tag(line, true, false);
          } else {
            return inc_type_7;
          }
        })();
      }
    } else {
      return false;
    }
  };
}
function make_is_a_html_tag() {
  return (in$, anchor_start, anchor_end) => {
    let s = "^[ ]{0,3}";
    let e = "$";
    let $ = from_string("<" + tag_name + attribute3 + "*" + "\\s*/?>");
    let open_tag;
    if ($ instanceof Ok) {
      open_tag = $[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 281, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $,
        start: 9539,
        end: 9639,
        pattern_start: 9550,
        pattern_end: 9562
      });
    }
    let $1 = from_string(s + "<" + tag_name + attribute3 + "*" + "\\s*/?>");
    let open_tag_s;
    if ($1 instanceof Ok) {
      open_tag_s = $1[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 283, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $1,
        start: 9644,
        end: 9751,
        pattern_start: 9655,
        pattern_end: 9669
      });
    }
    let $2 = from_string("<" + tag_name + attribute3 + "*" + "\\s*/?>" + e);
    let open_tag_e;
    if ($2 instanceof Ok) {
      open_tag_e = $2[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 285, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $2,
        start: 9756,
        end: 9863,
        pattern_start: 9767,
        pattern_end: 9781
      });
    }
    let $3 = from_string(s + "<" + tag_name + attribute3 + "*" + "\\s*/?>" + e);
    let open_tag_se;
    if ($3 instanceof Ok) {
      open_tag_se = $3[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 287, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $3,
        start: 9868,
        end: 9998,
        pattern_start: 9879,
        pattern_end: 9894
      });
    }
    let $4 = from_string("</" + tag_name + "\\s*[>]");
    let close_tag;
    if ($4 instanceof Ok) {
      close_tag = $4[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 291, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $4,
        start: 10003,
        end: 10079,
        pattern_start: 10014,
        pattern_end: 10027
      });
    }
    let $5 = from_string(s + "</" + tag_name + "\\s*[>]");
    let close_tag_s;
    if ($5 instanceof Ok) {
      close_tag_s = $5[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 292, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $5,
        start: 10084,
        end: 10173,
        pattern_start: 10095,
        pattern_end: 10110
      });
    }
    let $6 = from_string("</" + tag_name + "\\s*[>]" + e);
    let close_tag_e;
    if ($6 instanceof Ok) {
      close_tag_e = $6[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 294, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $6,
        start: 10178,
        end: 10267,
        pattern_start: 10189,
        pattern_end: 10204
      });
    }
    let $7 = from_string(s + "</" + tag_name + "\\s*[>]" + e);
    let close_tag_se;
    if ($7 instanceof Ok) {
      close_tag_se = $7[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 296, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $7,
        start: 10272,
        end: 10367,
        pattern_start: 10283,
        pattern_end: 10299
      });
    }
    if (anchor_start) {
      if (anchor_end) {
        return check2(open_tag_se, in$) || check2(close_tag_se, in$);
      } else {
        return check2(open_tag_s, in$) || check2(close_tag_s, in$);
      }
    } else {
      if (anchor_end) {
        return check2(open_tag_e, in$) || check2(close_tag_e, in$);
      } else {
        return check2(open_tag, in$) || check2(close_tag, in$);
      }
    }
  };
}
function new$7() {
  let sp_dot_paren = new$5(toList([".", ")"]));
  let is_a_html_tag = make_is_a_html_tag();
  let is_html_block_start = make_is_html_block_start(is_a_html_tag);
  let is_pct = make_is_paragraph_continuation_text(is_html_block_start, sp_dot_paren);
  let re_starts_with_ws = re_from_string("^\\s");
  let re_ends_with_ws = re_from_string("\\s$");
  let re_starts_with_p = re_from_string("^" + punctuation);
  let re_ends_with_p = re_from_string(punctuation + "$");
  let starts_with_ws = (s) => {
    let $ = s === "";
    if ($) {
      return $;
    } else {
      return check2(re_starts_with_ws, s);
    }
  };
  let ends_with_ws = (s) => {
    let $ = s === "";
    if ($) {
      return $;
    } else {
      return check2(re_ends_with_ws, s);
    }
  };
  let starts_with_p = (s) => {
    return check2(re_starts_with_p, s);
  };
  let ends_with_p = (s) => {
    return check2(re_ends_with_p, s);
  };
  let html_1_start = re_from_string_i("^<(?:pre|script|style|textarea)(?:(?:[ \\t>])|$)");
  let html_1_end = re_from_string_i("<\\/(?:pre|script|style|textarea)>");
  let html_2_start = re_from_string_i("^<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:(?:[ \\t>])|$|\\/>)");
  let html_3_start = re_from_string("^<![A-Za-z]");
  return new Cache2(re_from_string("^#+[ \\t]*$"), re_from_string("[ \\t]+#+[ \\t]*$"), re_from_string("\\{#(\\S+)\\}[ \\t]*$"), re_from_string("^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\\x00-\\x20<> ]*$"), re_from_string("^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"), re_from_string("^[ ]{0,3}=+[ \\t]*$"), re_from_string("^[ ]{0,3}-+[ \\t]*$"), re_from_string("<" + tag_name + attribute3 + "*" + "\\s/?>"), re_from_string("</" + tag_name + attribute3 + "*" + "\\s/?>"), is_html_block_start, is_pct, is_a_html_tag, starts_with_ws, ends_with_ws, starts_with_p, ends_with_p, html_1_start, html_1_end, html_2_start, html_3_start, new$5(toList([" ", "\t"])), new$5(toList([`
`, `\r
`])), new$5(toList(["://", ":"])), new$5(toList([";"])), new$5(toList(["?"])), new$5(toList(["\\"])), new$5(toList(["\\", "&", "<", ">", '"'])), sp_dot_paren, new$5(toList([">", "\\", '"', "'"])), new$5(toList(["[", "]", "\\", `
`])), new$5(toList(["\\", " ", "\t", ")", "(", `
`])), new$5(toList([
    "\\",
    "*",
    "_",
    "~~",
    "==",
    "![",
    "[^",
    "[",
    "`",
    "<",
    ">",
    "&",
    '"',
    `
`,
    "]",
    "https://",
    "http://",
    "www."
  ])), new$5(toList(["\\", "[", "]"])), new$5(toList(["\\", '"', "'", "(", ")", `
`])), new$5(toList(["\\", `
`, "<", ">"])), new$5(toList(["`"])), new$5(toList(["|", "\\|"])));
}

// build/dev/javascript/mork/mork/internal/mork_ffi.js
function do_try_pop(pos, ch, orelse, cont) {
  if (pos.startsWith(ch)) {
    return cont(pos.slice(1));
  } else {
    return orelse();
  }
}
function do_take_while(haystack, needle, acc) {
  while (haystack.startsWith(needle)) {
    acc = needle + acc;
    haystack = haystack.slice(1);
  }
  return [acc, haystack];
}

// build/dev/javascript/mork/mork/internal/parser.mjs
var FILEPATH3 = "src\\mork\\internal\\parser.gleam";

class Parser extends CustomType {
  constructor(line_splitter, start5, rest, line, pos, indent) {
    super();
    this.line_splitter = line_splitter;
    this.start = start5;
    this.rest = rest;
    this.line = line;
    this.pos = pos;
    this.indent = indent;
  }
}
function new_state(start5, line_splitter) {
  let $ = split3(line_splitter, start5);
  let current = $[0];
  let rest = $[2];
  let $1 = expand_tabs_indent(current);
  let line = $1[0];
  let indent = $1[1];
  return new Parser(line_splitter, start5, rest, line, line, indent);
}
function advance_line(state) {
  let $ = split3(state.line_splitter, state.rest);
  let new_current = $[0];
  let new_rest = $[2];
  let $1 = expand_tabs_indent(new_current);
  let line = $1[0];
  let indent = $1[1];
  return new Parser(state.line_splitter, state.start, new_rest, line, line, indent);
}
function next_line_is_blank(state) {
  let $ = split3(state.line_splitter, state.rest);
  let next = $[0];
  return is_blank(next);
}
function next_line(state) {
  let $ = split3(state.line_splitter, state.rest);
  let next = $[0];
  return next;
}
function at_eof(state) {
  return state.line === "" && state.rest === "";
}
function update_pos(state, pos) {
  return new Parser(state.line_splitter, state.start, state.rest, state.line, pos, state.indent);
}
function try_pop2(state, ch, orelse, cont) {
  return do_try_pop(state.pos, ch, orelse, (pos) => {
    return cont(update_pos(state, pos));
  });
}
function next_nonspace(loop$state, loop$cont) {
  while (true) {
    let state = loop$state;
    let cont = loop$cont;
    let pos = gobble_hspace(state.pos);
    if (pos === "") {
      let $ = at_eof(state);
      if ($) {
        return cont(state);
      } else {
        loop$state = advance_line(state);
        loop$cont = cont;
      }
    } else {
      return cont(update_pos(state, pos));
    }
  }
}
function next_line_if_blank(state, cont) {
  let pos = gobble_hspace(state.pos);
  if (pos === "") {
    return lazy_guard(at_eof(state), () => {
      return cont(state);
    }, () => {
      let state$1 = advance_line(state);
      let pos$1 = gobble_hspace(state$1.pos);
      return cont(update_pos(state$1, pos$1));
    });
  } else {
    return cont(update_pos(state, pos));
  }
}
function do_merge_until_unescaped_end_bracket(loop$in, loop$sp, loop$acc, loop$stack) {
  while (true) {
    let in$ = loop$in;
    let sp = loop$sp;
    let acc = loop$acc;
    let stack = loop$stack;
    let $ = split3(sp, in$);
    let l = $[0];
    let s = $[1];
    let r = $[2];
    let body = acc + l;
    if (s === "") {
      return l;
    } else if (s === "[") {
      loop$in = r;
      loop$sp = sp;
      loop$acc = body + "[";
      loop$stack = prepend("]", stack);
    } else if (s === "]") {
      if (stack instanceof Empty) {
        return body + "]" + r;
      } else {
        let $1 = stack.head;
        if ($1 === "]") {
          let stack$1 = stack.tail;
          loop$in = r;
          loop$sp = sp;
          loop$acc = body + "]";
          loop$stack = stack$1;
        } else {
          throw makeError("panic", FILEPATH3, "mork/internal/parser", 140, "do_merge_until_unescaped_end_bracket", "unexpected stack contents", {});
        }
      }
    } else if (s === "\\") {
      let $1 = r.charCodeAt(0);
      if ($1 === 92) {
        let r$1 = r.slice(1);
        loop$in = r$1;
        loop$sp = sp;
        loop$acc = body + "\\\\";
        loop$stack = stack;
      } else if ($1 === 91) {
        let r$1 = r.slice(1);
        loop$in = r$1;
        loop$sp = sp;
        loop$acc = body + "\\[";
        loop$stack = stack;
      } else if ($1 === 93) {
        let r$1 = r.slice(1);
        loop$in = r$1;
        loop$sp = sp;
        loop$acc = body + "\\]";
        loop$stack = stack;
      } else {
        loop$in = r;
        loop$sp = sp;
        loop$acc = body + "\\";
        loop$stack = stack;
      }
    } else if (s === `
`) {
      loop$in = r;
      loop$sp = sp;
      loop$acc = body + " ";
      loop$stack = stack;
    } else {
      throw makeError("panic", FILEPATH3, "mork/internal/parser", 153, "do_merge_until_unescaped_end_bracket", "unexpected split", {});
    }
  }
}
function merge_until_unescaped_end_bracket(state, lbrbescn, cont) {
  let data = do_merge_until_unescaped_end_bracket(state.pos + `
` + state.rest, lbrbescn, "", List$Empty$const);
  return cont(new_state(data, state.line_splitter));
}

// build/dev/javascript/mork/mork/internal/context.mjs
class Context extends CustomType {
  constructor(cache, state, stack, doc, nest) {
    super();
    this.cache = cache;
    this.state = state;
    this.stack = stack;
    this.doc = doc;
    this.nest = nest;
  }
}
class NestItem extends CustomType {
  constructor(indent) {
    super();
    this.indent = indent;
  }
}
function from_string2(options, text4) {
  let cache = new$7();
  let state = new_state(text4, cache.sp_line);
  let doc = new$6(options);
  return new Context(cache, state, List$Empty$const, doc, List$Empty$const);
}
function update_blocks(ctx, blocks) {
  return new Context(ctx.cache, ctx.state, ctx.stack, (() => {
    let _record = ctx.doc;
    return new Document(_record.options, blocks, _record.links, _record.footnotes);
  })(), ctx.nest);
}
function advance_pos(ctx, pos) {
  return new Context(ctx.cache, update_pos(ctx.state, pos), ctx.stack, ctx.doc, ctx.nest);
}
function advance_line2(ctx) {
  return new Context(ctx.cache, advance_line(ctx.state), ctx.stack, ctx.doc, ctx.nest);
}
function advance_line_with_blocks(ctx, blocks) {
  return new Context(ctx.cache, advance_line(ctx.state), ctx.stack, (() => {
    let _record = ctx.doc;
    return new Document(_record.options, blocks, _record.links, _record.footnotes);
  })(), ctx.nest);
}
function with_raw(ctx, raw) {
  return new Context(ctx.cache, (() => {
    let _record = ctx.state;
    return new Parser(_record.line_splitter, raw, _record.rest, _record.line, _record.pos, _record.indent);
  })(), ctx.stack, ctx.doc, ctx.nest);
}
function with_state_reset_blocks(ctx, raw) {
  return new Context(ctx.cache, new_state(raw, ctx.cache.sp_line), List$Empty$const, (() => {
    let _record = ctx.doc;
    return new Document(_record.options, List$Empty$const, _record.links, _record.footnotes);
  })(), List$Empty$const);
}
function merge2(ctx, other, blocks) {
  return new Context(ctx.cache, ctx.state, ctx.stack, new Document(ctx.doc.options, blocks, other.doc.links, other.doc.footnotes), ctx.nest);
}

// build/dev/javascript/mork/mork/internal/blocks.mjs
var FILEPATH4 = "src\\mork\\internal\\blocks.gleam";

class SetextH1 extends CustomType {
}
var SetextLine$SetextH1$const = new SetextH1;

class SetextH2 extends CustomType {
}
var SetextLine$SetextH2$const = new SetextH2;

class SetextNot extends CustomType {
}
var SetextLine$SetextNot$const = new SetextNot;
function try_parse_blank(ctx, cont) {
  let $ = (() => {
    let _pipe = ctx.state.pos;
    return is_blank(_pipe);
  })();
  if ($) {
    return advance_line_with_blocks(ctx, prepend(Block$Newline$const, ctx.doc.blocks));
  } else {
    return cont();
  }
}
function setext_underline(ctx, line) {
  return guard(check2(ctx.cache.setext_h1, line), SetextLine$SetextH1$const, () => {
    return guard(check2(ctx.cache.setext_h2, line), SetextLine$SetextH2$const, () => {
      return SetextLine$SetextNot$const;
    });
  });
}
function is_blockquote_line(line) {
  let line$1 = drop_3_spaces(line);
  if (line$1.charCodeAt(0) === 62) {
    return true;
  } else {
    return false;
  }
}
function do_take_lines(loop$ctx, loop$cond, loop$acc) {
  while (true) {
    let ctx = loop$ctx;
    let cond = loop$cond;
    let acc = loop$acc;
    let $ = at_eof(ctx.state);
    if ($) {
      return [ctx, acc];
    } else {
      let $1 = cond(ctx.state.pos);
      if ($1 instanceof Some) {
        let line = $1[0];
        loop$ctx = advance_line2(ctx);
        loop$cond = cond;
        loop$acc = prepend(line, acc);
      } else {
        return [ctx, acc];
      }
    }
  }
}
function take_lines(ctx, cond) {
  let $ = do_take_lines(ctx, cond, List$Empty$const);
  let ctx$1 = $[0];
  let lines = $[1];
  return [ctx$1, reverse(lines)];
}
function nest_indent(ctx) {
  let $ = ctx.nest;
  if ($ instanceof Empty) {
    return 0;
  } else {
    let indent = $.head.indent;
    return indent;
  }
}
function take_first_paragraph_line(ctx, cont, when_ok) {
  let line = ctx.state.pos;
  let $ = is_blank(line);
  if ($) {
    return cont();
  } else {
    return when_ok(advance_line2(ctx), line);
  }
}
function try_parse_paragraph(ctx, cont) {
  return take_first_paragraph_line(ctx, cont, (ctx2, line) => {
    let nest = nest_indent(ctx2);
    let $ = take_lines(ctx2, (line2) => {
      let undented = drop_indent(line2, nest);
      let line_indent = find_indent(line2);
      let $1 = !(is_blockquote_line(undented) || !(setext_underline(ctx2, undented) instanceof SetextNot) && (ctx2.nest instanceof Empty || ctx2.state.indent > 0)) && (is_empty_list(ctx2.cache.sp_dot_paren, line2) || nest > line_indent && line_indent > 3 || ctx2.cache.is_paragraph_continuation_text(undented));
      if ($1) {
        return new Some(undented);
      } else {
        return Option$None$const;
      }
    });
    let ctx$1 = $[0];
    let lines = $[1];
    let lines$1 = prepend(line, lines);
    return lazy_guard(lines$1 instanceof Empty, cont, () => {
      let raw = join(lines$1, `
`);
      return lazy_guard(!(ctx$1.nest instanceof Empty) && ctx$1.state.indent === 0, () => {
        return update_blocks(ctx$1, prepend(new Paragraph(raw, List$Empty$const), ctx$1.doc.blocks));
      }, () => {
        let $1 = setext_underline(ctx$1, ctx$1.state.pos);
        if ($1 instanceof SetextH1) {
          return advance_line_with_blocks(ctx$1, prepend(new Heading(1, "", raw, List$Empty$const), ctx$1.doc.blocks));
        } else if ($1 instanceof SetextH2) {
          return advance_line_with_blocks(ctx$1, prepend(new Heading(2, "", raw, List$Empty$const), ctx$1.doc.blocks));
        } else {
          return update_blocks(ctx$1, prepend(new Paragraph(raw, List$Empty$const), ctx$1.doc.blocks));
        }
      });
    });
  });
}
function do_pipe_split(loop$pipe, loop$input, loop$acc, loop$res) {
  while (true) {
    let pipe = loop$pipe;
    let input2 = loop$input;
    let acc = loop$acc;
    let res = loop$res;
    let $ = split3(pipe, input2);
    let l = $[0];
    let s = $[1];
    let r = $[2];
    let body = acc + l;
    if (s === "|") {
      loop$pipe = pipe;
      loop$input = r;
      loop$acc = "";
      loop$res = prepend(body, res);
    } else if (s === "\\|") {
      loop$pipe = pipe;
      loop$input = r;
      loop$acc = body + "|";
      loop$res = res;
    } else if (s === "") {
      return prepend(body, res);
    } else {
      throw makeError("panic", FILEPATH4, "mork/internal/blocks", 1137, "do_pipe_split", "unreachable", {});
    }
  }
}
function pipe_split(pipe, input2) {
  let input$1 = trim(input2);
  let _block;
  let $ = starts_with(input$1, "|") && ends_with(input$1, "|");
  if ($) {
    _block = slice(input$1, 1, string_length(input$1) - 2);
  } else {
    _block = input$1;
  }
  let input$2 = _block;
  let _pipe = do_pipe_split(pipe, input$2, "", List$Empty$const);
  return reverse(_pipe);
}
function parse_table_row(ctx, num_cols, row) {
  let _block;
  let _pipe = pipe_split(ctx.cache.sp_pipe, row);
  _block = map2(_pipe, (_capture) => {
    return new Cell(_capture, List$Empty$const);
  });
  let cols = _block;
  let $ = num_cols === length(cols);
  if ($) {
    return new Some(cols);
  } else {
    return Option$None$const;
  }
}
function parse_header_row(pipe, header, num_cols, aligns) {
  let cols = pipe_split(pipe, header);
  let true_len = length(cols);
  let $ = true_len === length(aligns) && true_len === num_cols;
  if ($) {
    return new Ok(map2(zip(cols, aligns), (data) => {
      let raw = data[0];
      let align = data[1];
      return new THead(align, raw, List$Empty$const);
    }));
  } else {
    return new Error(undefined);
  }
}
function column_alignment(spec) {
  let spec$1 = trim(spec);
  let $ = from_string("^:?-+:?$");
  let re;
  if ($ instanceof Ok) {
    re = $[0];
  } else {
    throw makeError("let_assert", FILEPATH4, "mork/internal/blocks", 1084, "column_alignment", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 30770,
      end: 30820,
      pattern_start: 30781,
      pattern_end: 30787
    });
  }
  let $1 = check2(re, spec$1);
  if ($1) {
    let l = starts_with(spec$1, ":");
    let r = ends_with(spec$1, ":");
    return new Ok((() => {
      if (r) {
        if (l === true) {
          return Alignment$Center$const;
        } else {
          return Alignment$Right$const;
        }
      } else {
        return Alignment$Left$const;
      }
    })());
  } else {
    return new Error(undefined);
  }
}
function do_delim_row(loop$pipe, loop$input, loop$count, loop$res) {
  while (true) {
    let pipe = loop$pipe;
    let input2 = loop$input;
    let count2 = loop$count;
    let res = loop$res;
    let input$1 = gobble_hspace(input2);
    let $ = split3(pipe, input$1);
    let l = $[0];
    let s = $[1];
    let r = $[2];
    if (s === "\\|") {
      return new Error(undefined);
    } else if (s === "|") {
      let $1 = l === "";
      if ($1) {
        if (res instanceof Empty) {
          loop$pipe = pipe;
          loop$input = r;
          loop$count = count2;
          loop$res = res;
        } else {
          loop$pipe = pipe;
          loop$input = r;
          loop$count = count2 + 1;
          loop$res = prepend(Alignment$Left$const, res);
        }
      } else {
        let $2 = column_alignment(l);
        if ($2 instanceof Ok) {
          let align = $2[0];
          loop$pipe = pipe;
          loop$input = r;
          loop$count = count2 + 1;
          loop$res = prepend(align, res);
        } else {
          return $2;
        }
      }
    } else if (s === "") {
      let $1 = l === "";
      if ($1) {
        return new Ok([count2, res]);
      } else {
        let $2 = column_alignment(l);
        if ($2 instanceof Ok) {
          let align = $2[0];
          return new Ok([count2 + 1, prepend(align, res)]);
        } else {
          return $2;
        }
      }
    } else {
      throw makeError("panic", FILEPATH4, "mork/internal/blocks", 1078, "do_delim_row", "unreachable", {});
    }
  }
}
function parse_delim_row(pipe, s) {
  let _pipe = do_delim_row(pipe, s, 0, List$Empty$const);
  return map4(_pipe, (v) => {
    return [
      v[0],
      (() => {
        let _pipe$1 = v[1];
        return reverse(_pipe$1);
      })()
    ];
  });
}
function maybe_delim_row(loop$s, loop$npipes) {
  while (true) {
    let s = loop$s;
    let npipes = loop$npipes;
    let $ = gobble_hspace(s);
    let $1 = $.charCodeAt(0);
    if ($1 === 124) {
      let s$1 = $.slice(1);
      loop$s = s$1;
      loop$npipes = npipes + 1;
    } else if ($1 === 45) {
      let s$1 = $.slice(1);
      loop$s = s$1;
      loop$npipes = npipes;
    } else if ($1 === 58) {
      let s$1 = $.slice(1);
      loop$s = s$1;
      loop$npipes = npipes;
    } else if ($1 === 32) {
      let s$1 = $.slice(1);
      loop$s = s$1;
      loop$npipes = npipes;
    } else if ($ === "") {
      return npipes > 0;
    } else {
      return false;
    }
  }
}
function try_parse_table(ctx, abort) {
  return lazy_guard(!ctx.doc.options.tables, abort, () => {
    let pipe = ctx.cache.sp_pipe;
    let delim_row = next_line(ctx.state);
    let $ = maybe_delim_row(delim_row, 0);
    if ($) {
      let $1 = parse_delim_row(pipe, delim_row);
      if ($1 instanceof Ok) {
        let num_cols = $1[0][0];
        let aligns = $1[0][1];
        let $2 = parse_header_row(pipe, ctx.state.pos, num_cols, aligns);
        if ($2 instanceof Ok) {
          let header = $2[0];
          let _block;
          let _pipe = ctx;
          let _pipe$1 = advance_line2(_pipe);
          _block = advance_line2(_pipe$1);
          let ctx$1 = _block;
          let $3 = take_lines(ctx$1, (_capture) => {
            return parse_table_row(ctx$1, num_cols, _capture);
          });
          let ctx$2 = $3[0];
          let rows = $3[1];
          return update_blocks(ctx$2, prepend(new Table(header, rows), ctx$2.doc.blocks));
        } else {
          return abort();
        }
      } else {
        return abort();
      }
    } else {
      return abort();
    }
  });
}
function block_fallback(ctx) {
  return try_parse_table(ctx, () => {
    return try_parse_paragraph(ctx, () => {
      return try_parse_blank(ctx, () => {
        throw makeError("panic", FILEPATH4, "mork/internal/blocks", 63, "block_fallback", "try_parse_block could not parse: " + inspect2(ctx), {});
      });
    });
  });
}
function are_separated(items) {
  if (items instanceof Empty) {
    return false;
  } else {
    let $ = items.tail;
    if ($ instanceof Empty) {
      return false;
    } else {
      let item = items.head;
      let rest = $;
      return item.ends_with_blank || are_separated(rest);
    }
  }
}
function calculate_list_pack(items) {
  let contains = any(items, (item) => {
    return item.contains_blank;
  });
  return check3(contains || are_separated(items), ListPack$Loose$const, ListPack$Tight$const);
}
function block_contains_blank(block) {
  return block instanceof Newline;
}
function item_contains_blank(blocks) {
  return count(blocks, (block) => {
    if (block instanceof Paragraph) {
      return true;
    } else {
      return false;
    }
  }) > 1 || any(blocks, block_contains_blank);
}
function item_ends_with_blank(lines) {
  let _block;
  let _pipe = lines;
  _block = reverse(_pipe);
  let lines$1 = _block;
  if (lines$1 instanceof Empty) {
    return false;
  } else {
    let $ = lines$1.tail;
    if ($ instanceof Empty) {
      return false;
    } else {
      let head = lines$1.head;
      return head === "";
    }
  }
}
function set_nest_listitem(ctx, indent) {
  return new Context(ctx.cache, ctx.state, ctx.stack, ctx.doc, prepend(new NestItem(indent), ctx.nest));
}
function is_list_item(ctx, line) {
  return guard(match_hr(line), false, () => {
    let $ = parse_bullet_item(line);
    if ($ instanceof Ok) {
      return true;
    } else {
      let $1 = parse_ordinal_item(ctx.cache.sp_dot_paren, line);
      if ($1 instanceof Ok) {
        return true;
      } else {
        return false;
      }
    }
  });
}
function list_item_line(ctx, line, indent, lazy) {
  let line$1 = drop_indent(line, nest_indent(ctx));
  let line_indent = find_indent(line$1);
  return lazy_guard(is_blank(line$1), () => {
    return new Some("");
  }, () => {
    return lazy_guard(!lazy && line_indent < indent, () => {
      return Option$None$const;
    }, () => {
      return lazy_guard(line_indent < indent && is_empty_list(ctx.cache.sp_dot_paren, line$1), () => {
        return Option$None$const;
      }, () => {
        return lazy_guard(line_indent === 0 && is_list_item(ctx, line$1), () => {
          return Option$None$const;
        }, () => {
          return guard(lazy && ctx.cache.is_paragraph_continuation_text(line$1), new Some(line$1), () => {
            return lazy_guard(lazy && ctx.state.indent > 0 && !(setext_underline(ctx, line$1) instanceof SetextNot), () => {
              return new Some(line$1);
            }, () => {
              let $ = line_indent >= indent;
              if ($) {
                return new Some(line$1);
              } else {
                return Option$None$const;
              }
            });
          });
        });
      });
    });
  });
}
function do_take_lines_with_state(ctx, state, cond, acc) {
  return guard(at_eof(ctx.state), [ctx, acc], () => {
    let $ = cond(ctx.state.pos, state);
    let $1 = $[0];
    if ($1 instanceof Some) {
      let state$1 = $[1];
      let line = $1[0];
      let ctx$1 = new Context(ctx.cache, advance_line(ctx.state), ctx.stack, ctx.doc, ctx.nest);
      return do_take_lines_with_state(ctx$1, state$1, cond, prepend(line, acc));
    } else {
      return [ctx, acc];
    }
  });
}
function take_lines_with_state(ctx, state, cond) {
  let $ = do_take_lines_with_state(ctx, state, cond, List$Empty$const);
  let ctx$1 = $[0];
  let lines = $[1];
  return [ctx$1, reverse(lines)];
}
function list_item_indent(ctx, line, marker) {
  if (marker === ".") {
    let $ = parse_ordinal_item(ctx.cache.sp_dot_paren, line);
    if ($ instanceof Ok) {
      let indent = $[0][1];
      return indent;
    } else {
      return 0;
    }
  } else if (marker === ")") {
    let $ = parse_ordinal_item(ctx.cache.sp_dot_paren, line);
    if ($ instanceof Ok) {
      let indent = $[0][1];
      return indent;
    } else {
      return 0;
    }
  } else {
    let $ = parse_bullet_item(line);
    if ($ instanceof Ok) {
      let indent = $[0][1];
      return indent;
    } else {
      return 0;
    }
  }
}
function raw_line_minus_nest(ctx) {
  let $ = ctx.nest;
  if ($ instanceof Empty) {
    return ctx.state.line;
  } else {
    let indent = $.head.indent;
    return drop_indent(ctx.state.line, indent);
  }
}
function list_item_line_start(ctx, marker, require_indent) {
  let line = raw_line_minus_nest(ctx);
  return guard(is_blank(line), [Option$None$const, require_indent], () => {
    let line_indent = find_indent(line);
    let list_indent = list_item_indent(ctx, line, marker);
    return guard(line_indent > require_indent, [Option$None$const, list_indent], () => {
      return guard(match_hr(line), [Option$None$const, list_indent], () => {
        return lazy_guard(is_empty_list(ctx.cache.sp_dot_paren, line), () => {
          let $ = has_list_marker(line, marker);
          if ($) {
            return [new Some(""), list_indent];
          } else {
            return [Option$None$const, list_indent];
          }
        }, () => {
          return lazy_guard(has_list_marker(line, marker), () => {
            return [
              new Some(clear_marker(line, marker, list_indent)),
              list_indent
            ];
          }, () => {
            return [Option$None$const, list_indent];
          });
        });
      });
    });
  });
}
function try_or(res, when_err, when_ok) {
  if (res instanceof Ok) {
    let v = res[0];
    return when_ok(v);
  } else {
    return when_err();
  }
}
function new_code_block(lang, lines) {
  return new Code(lang, join(reverse(lines), `
`) + `
`);
}
function drop_empty(lines) {
  if (lines instanceof Empty) {
    return lines;
  } else {
    let $ = lines.head;
    if ($ === "") {
      let lines$1 = lines.tail;
      return lines$1;
    } else {
      return lines;
    }
  }
}
function drop_empty_tail(lines) {
  let _pipe = lines;
  let _pipe$1 = reverse(_pipe);
  let _pipe$2 = drop_empty(_pipe$1);
  return reverse(_pipe$2);
}
function add_indented_code_block(ctx, lines) {
  let _block;
  let _pipe = lines;
  let _pipe$1 = drop_empty(_pipe);
  _block = drop_empty_tail(_pipe$1);
  let lines$1 = _block;
  return update_blocks(ctx, prepend(new_code_block(Option$None$const, lines$1), ctx.doc.blocks));
}
function do_indented(loop$ctx, loop$indent, loop$lines) {
  while (true) {
    let ctx = loop$ctx;
    let indent = loop$indent;
    let lines = loop$lines;
    let to_drop = 4 + indent;
    let lines$1 = prepend(drop_indent(ctx.state.line, to_drop), lines);
    let ctx$1 = new Context(ctx.cache, advance_line(ctx.state), ctx.stack, ctx.doc, ctx.nest);
    let $ = !at_eof(ctx$1.state) && (ctx$1.state.indent >= to_drop || is_blank(ctx$1.state.pos));
    if ($) {
      loop$ctx = ctx$1;
      loop$indent = indent;
      loop$lines = lines$1;
    } else {
      return add_indented_code_block(ctx$1, lines$1);
    }
  }
}
function try_parse_indented_code(ctx, cont) {
  let nest_indent$1 = nest_indent(ctx);
  return lazy_guard(ctx.state.indent - nest_indent$1 < 4, cont, () => {
    return do_indented(ctx, nest_indent$1, List$Empty$const);
  });
}
function try_parse_thematic_break(ctx, cont) {
  return lazy_guard(!match_hr(ctx.state.pos), cont, () => {
    return advance_line_with_blocks(ctx, prepend(Block$ThematicBreak$const, ctx.doc.blocks));
  });
}
function set_link(doc, label, dest, title2) {
  let _block;
  let _pipe = label;
  _block = casefold(_pipe);
  let label$1 = _block;
  let links = upsert(doc.links, label$1, (current) => {
    if (current instanceof Some) {
      let v = current[0];
      return v;
    } else {
      return new LinkData(dest, title2);
    }
  });
  return new Document(doc.options, doc.blocks, links, doc.footnotes);
}
function with_doc(ctx, doc) {
  return new Context(ctx.cache, ctx.state, ctx.stack, doc, ctx.nest);
}
function starts_title(in$) {
  return starts_with(in$, '"') || starts_with(in$, "'") || starts_with(in$, "(");
}
function next_line_if_blank2(ctx, in$) {
  let $ = is_blank(in$);
  if ($) {
    let ctx$1 = advance_line2(ctx);
    return [ctx$1, ctx$1.state.pos];
  } else {
    return [ctx, in$];
  }
}
function do_try_parse_link(ctx) {
  return next_nonspace(ctx.state, (state) => {
    return merge_until_unescaped_end_bracket(state, ctx.cache.sp_link_text, (state2) => {
      let $ = gobble_link_label(ctx.cache.sp_link_label, state2.pos);
      let label = $[0];
      let pos = $[1];
      return guard(label === "", new Error(undefined), () => {
        let state$1 = update_pos(state2, pos);
        return try_pop2(state$1, ":", () => {
          return new Error(undefined);
        }, (state3) => {
          return next_line_if_blank(state3, (state4) => {
            let ctx$1 = new Context(ctx.cache, state4, ctx.stack, ctx.doc, ctx.nest);
            let in$ = state4.pos;
            return parse_link_dest(in$, ctx$1.cache.sp_link_dest, ctx$1.cache.sp_link_dest_tag, (dest, in$2) => {
              let in$1 = gobble_hspace(in$2);
              let state$2 = update_pos(state4, in$1);
              let with_title = (ctx2, in$3) => {
                return parse_link_title(in$3, ctx2.cache.sp_link_title, (title2, in$4) => {
                  let $1 = is_blankn(in$4);
                  if ($1) {
                    let doc = set_link(ctx2.doc, label, dest, title2);
                    let ctx$2 = new Context(ctx2.cache, new_state(in$4, ctx2.cache.sp_line), ctx2.stack, doc, ctx2.nest);
                    return new Ok(ctx$2);
                  } else {
                    return new Error(undefined);
                  }
                });
              };
              return lazy_guard(starts_title(in$1), () => {
                let $1 = with_title(ctx$1, in$1 + `
` + state$2.rest);
                if ($1 instanceof Ok) {
                  return $1;
                } else {
                  return new Error(undefined);
                }
              }, () => {
                let $1 = next_line_if_blank2(ctx$1, in$1);
                let ctx$2 = $1[0];
                let in$22 = $1[1];
                let state$3 = ctx$2.state;
                let in$3 = gobble_hspace(in$22);
                let $2 = starts_title(in$3);
                if ($2) {
                  let $3 = with_title(ctx$2, in$3 + `
` + state$3.rest);
                  if ($3 instanceof Ok) {
                    return $3;
                  } else {
                    return new Ok(with_doc(ctx$2, set_link(ctx$2.doc, label, dest, Option$None$const)));
                  }
                } else {
                  return new Ok(with_doc(ctx$2, set_link(ctx$2.doc, label, dest, Option$None$const)));
                }
              });
            });
          });
        });
      });
    });
  });
}
function try_parse_link(ctx, cont) {
  return lazy_unwrap(do_try_parse_link(ctx), cont);
}
function set_footnote(doc, label, blocks) {
  let _block;
  let _pipe = label;
  _block = casefold(_pipe);
  let label$1 = _block;
  let num = size(doc.footnotes) + 1;
  let footnotes = upsert(doc.footnotes, label$1, (current) => {
    if (current instanceof Some) {
      let v = current[0];
      return v;
    } else {
      return new FootnoteData(num, blocks);
    }
  });
  return new Document(doc.options, doc.blocks, doc.links, footnotes);
}
function skip_blanks(loop$ctx) {
  while (true) {
    let ctx = loop$ctx;
    let $ = !at_eof(ctx.state) && is_blank(ctx.state.pos);
    if ($) {
      loop$ctx = advance_line2(ctx);
    } else {
      return ctx;
    }
  }
}
function take_footnote_paragraphs(loop$ctx) {
  while (true) {
    let ctx = loop$ctx;
    let _block;
    let _pipe = try_parse_paragraph(ctx, () => {
      return ctx;
    });
    _block = skip_blanks(_pipe);
    let next = _block;
    let $ = next.state.indent >= 4 && !isEqual(next.doc.blocks, ctx.doc.blocks);
    if ($) {
      let state = update_pos(next.state, drop_indent(next.state.pos, 4));
      let next$1 = new Context(next.cache, state, next.stack, next.doc, next.nest);
      loop$ctx = next$1;
    } else {
      return next;
    }
  }
}
function do_try_parse_footnote(ctx) {
  return next_nonspace(ctx.state, (state) => {
    return try_pop2(state, "^", () => {
      return new Error(undefined);
    }, (state2) => {
      return merge_until_unescaped_end_bracket(state2, ctx.cache.sp_link_text, (state3) => {
        let $ = gobble_link_label(ctx.cache.sp_link_label, state3.pos);
        let label = $[0];
        let pos = $[1];
        return guard(label === "", new Error(undefined), () => {
          let state$1 = update_pos(state3, pos);
          return try_pop2(state$1, ":", () => {
            return new Error(undefined);
          }, (state4) => {
            return next_line_if_blank(state4, (state5) => {
              let footnote_ctx = new Context(ctx.cache, state5, ctx.stack, (() => {
                let _record = ctx.doc;
                return new Document(_record.options, List$Empty$const, _record.links, _record.footnotes);
              })(), prepend(new NestItem(4), ctx.nest));
              let footnote_ctx$1 = take_footnote_paragraphs(footnote_ctx);
              let doc = set_footnote(ctx.doc, label, footnote_ctx$1.doc.blocks);
              let ctx$1 = new Context(ctx.cache, footnote_ctx$1.state, ctx.stack, doc, ctx.nest);
              return new Ok(ctx$1);
            });
          });
        });
      });
    });
  });
}
function try_parse_footnote(ctx, cont) {
  let $ = ctx.doc.options.footnotes;
  if ($) {
    let _pipe = ctx;
    let _pipe$1 = do_try_parse_footnote(_pipe);
    return lazy_unwrap(_pipe$1, cont);
  } else {
    return cont();
  }
}
function do_take_lines_until_inclusive(ctx, strict, end_cond, acc) {
  return lazy_guard(at_eof(ctx.state), () => {
    return [
      ctx,
      (() => {
        if (strict) {
          return List$Empty$const;
        } else {
          return acc;
        }
      })()
    ];
  }, () => {
    let line = raw_line_minus_nest(ctx);
    let next = new Context(ctx.cache, advance_line(ctx.state), ctx.stack, ctx.doc, ctx.nest);
    let $ = end_cond(ctx.state);
    if ($) {
      return [next, prepend(line, acc)];
    } else {
      return do_take_lines_until_inclusive(next, strict, end_cond, prepend(line, acc));
    }
  });
}
function take_lines_until_inclusive(ctx, strict, end_cond) {
  let $ = do_take_lines_until_inclusive(ctx, strict, end_cond, List$Empty$const);
  let ctx$1 = $[0];
  let lines = $[1];
  return [ctx$1, reverse(lines)];
}
function html_block_condition(ctx, strict, start5, end, cont) {
  return lazy_guard(!start5(ctx.state), () => {
    return cont();
  }, () => {
    let $ = take_lines_until_inclusive(ctx, strict, end);
    let ctx$1 = $[0];
    let lines = $[1];
    if (lines instanceof Empty) {
      return cont();
    } else {
      let html = join(lines, `
`) + `
`;
      return update_blocks(ctx$1, prepend(new HtmlBlock(html), ctx$1.doc.blocks));
    }
  });
}
function try_parse_html(ctx, cont) {
  return html_block_condition(ctx, true, (state) => {
    return starts_with(state.pos, "<!--");
  }, (state) => {
    return contains_string(state.pos, "-->");
  }, () => {
    return html_block_condition(ctx, true, (state) => {
      return starts_with(state.pos, "<!--");
    }, (state) => {
      return contains_string(state.pos, "-->");
    }, () => {
      return html_block_condition(ctx, true, (state) => {
        return starts_with(state.pos, "<?");
      }, (state) => {
        return contains_string(state.pos, "?>");
      }, () => {
        return html_block_condition(ctx, true, (state) => {
          return starts_with(state.pos, "<![CDATA[");
        }, (state) => {
          return contains_string(state.pos, "]]>");
        }, () => {
          return html_block_condition(ctx, true, (state) => {
            return check2(ctx.cache.html_3_start, state.pos);
          }, (state) => {
            return contains_string(state.pos, ">");
          }, () => {
            return html_block_condition(ctx, false, (state) => {
              let ok = check2(ctx.cache.html_1_start, state.pos);
              return ok;
            }, (state) => {
              return lazy_guard(at_eof(state), () => {
                return true;
              }, () => {
                let ok = check2(ctx.cache.html_1_end, state.pos);
                return ok;
              });
            }, () => {
              return html_block_condition(ctx, true, (state) => {
                return guard(check2(ctx.cache.html_2_start, state.pos), true, () => {
                  return guard(state.pos === "<!-->", true, () => {
                    return guard(state.pos === "<!--->", true, () => {
                      return guard(starts_with(state.pos, "<!--") && ends_with(state.pos, "-->"), true, () => {
                        return ctx.cache.is_a_html_tag(state.pos, true, true);
                      });
                    });
                  });
                });
              }, next_line_is_blank, () => {
                return cont();
              });
            });
          });
        });
      });
    });
  });
}
function set_nest_blockquote(ctx) {
  let $ = ctx.nest;
  if ($ instanceof Empty) {
    return new Context(ctx.cache, ctx.state, ctx.stack, ctx.doc, prepend(new NestItem(0), ctx.nest));
  } else {
    return ctx;
  }
}
function line_is_codeblock(line) {
  let indent = find_indent(line);
  return guard(indent >= 4, true, () => {
    let line$1 = drop_3_spaces(line);
    let $ = line$1.charCodeAt(0);
    if ($ === 96) {
      let line$2 = line$1.slice(1);
      let $1 = take_quot_run(line$2, 1);
      let len = $1[0];
      let line$3 = $1[1];
      return guard(len < 3, false, () => {
        return guard(contains_string(line$3, "`"), false, () => {
          return true;
        });
      });
    } else if ($ === 126) {
      let line$2 = line$1.slice(1);
      let $1 = take_tilde_run(line$2, 1);
      let len = $1[0];
      return guard(len < 3, false, () => {
        return true;
      });
    } else {
      return false;
    }
  });
}
function take_hspaces(loop$tail, loop$rest) {
  while (true) {
    let tail = loop$tail;
    let rest = loop$rest;
    let $ = tail.charCodeAt(0);
    if ($ === 32) {
      let tail$1 = tail.slice(1);
      loop$tail = tail$1;
      loop$rest = rest;
    } else if ($ === 9) {
      let tail$1 = tail.slice(1);
      loop$tail = tail$1;
      loop$rest = rest;
    } else {
      return rest(tail);
    }
  }
}
function try_parse_fenced_code(ctx, fence_ch, rest, cont) {
  let $ = take_fence_run(rest, fence_ch);
  let fence_len = $[0];
  let rest$1 = $[1];
  return lazy_guard(fence_len < 3, cont, () => {
    return take_hspaces(rest$1, (rest2) => {
      return lazy_guard(fence_ch === "`" && contains_string(rest2, "`"), cont, () => {
        let _block;
        if (rest2 === "") {
          _block = Option$None$const;
        } else {
          _block = new Some(rest2);
        }
        let lang = _block;
        let nspaces = count_spaces(ctx.state.line, 0);
        let ctx$1 = advance_line2(ctx);
        let $1 = take_lines(ctx$1, (line) => {
          let dropped = drop_indent(line, nspaces);
          let text4 = drop_3_spaces(dropped);
          let $2 = take_fence_run(text4, fence_ch);
          let endlen_plus_1 = $2[0];
          let text$1 = $2[1];
          return guard(endlen_plus_1 <= fence_len, new Some(dropped), () => {
            return guard(!is_blank(text$1), new Some(dropped), () => {
              return Option$None$const;
            });
          });
        });
        let ctx$2 = $1[0];
        let lines = $1[1];
        let _block$1;
        if (lines instanceof Empty) {
          _block$1 = "";
        } else {
          _block$1 = join(lines, `
`) + `
`;
        }
        let body = _block$1;
        return advance_line_with_blocks(ctx$2, prepend(new Code(lang, body), ctx$2.doc.blocks));
      });
    });
  });
}
function do_heading_id(loop$text, loop$acc) {
  while (true) {
    let text4 = loop$text;
    let acc = loop$acc;
    let $ = pop_grapheme(text4);
    if ($ instanceof Ok) {
      let ch = $[0][0];
      let rest = $[0][1];
      let $1 = isalnum(ch);
      if ($1) {
        loop$text = rest;
        loop$acc = acc + ch;
      } else {
        if (ch === " ") {
          loop$text = rest;
          loop$acc = acc + "-";
        } else if (ch === "-") {
          loop$text = rest;
          loop$acc = acc + "-";
        } else if (ch === "_") {
          loop$text = rest;
          loop$acc = acc + "-";
        } else {
          loop$text = rest;
          loop$acc = acc;
        }
      }
    } else {
      return acc;
    }
  }
}
function heading_id(re, text4) {
  let $ = scan2(re, text4);
  if ($ instanceof Empty) {
    return do_heading_id(text4, "");
  } else {
    let $1 = $.tail;
    if ($1 instanceof Empty) {
      let $2 = $.head.submatches;
      if ($2 instanceof Empty) {
        return do_heading_id(text4, "");
      } else {
        let $3 = $2.head;
        if ($3 instanceof Some) {
          let $4 = $2.tail;
          if ($4 instanceof Empty) {
            let text$1 = $3[0];
            return text$1;
          } else {
            return do_heading_id(text4, "");
          }
        } else {
          return do_heading_id(text4, "");
        }
      }
    } else {
      return do_heading_id(text4, "");
    }
  }
}
function take_hspaces1(tail, cont, rest) {
  let $ = tail.charCodeAt(0);
  if ($ === 32) {
    let tail$1 = tail.slice(1);
    return take_hspaces(tail$1, rest);
  } else if ($ === 9) {
    let tail$1 = tail.slice(1);
    return take_hspaces(tail$1, rest);
  } else if (tail === "") {
    return rest(tail);
  } else {
    return cont();
  }
}
function take_hashes(loop$input, loop$acc) {
  while (true) {
    let input2 = loop$input;
    let acc = loop$acc;
    if (input2.charCodeAt(0) === 35) {
      let input$1 = input2.slice(1);
      loop$input = input$1;
      loop$acc = acc + 1;
    } else {
      return [acc, input2];
    }
  }
}
function try_parse_atx_heading(ctx, rest, cont) {
  let $ = take_hashes(rest, 1);
  let num = $[0];
  let rest$1 = $[1];
  return lazy_guard(num > 6, cont, () => {
    return take_hspaces1(rest$1, cont, (rest2) => {
      let rest$2 = replace3(ctx.cache.atx_heading_tail, rest2, "");
      let _block;
      let $1 = check2(ctx.cache.atx_heading_empty, rest$2);
      if ($1) {
        _block = "";
      } else {
        _block = rest$2;
      }
      let rest$3 = _block;
      let _block$1;
      let $2 = ctx.doc.options.heading_ids;
      if ($2) {
        _block$1 = heading_id(ctx.cache.atx_heading_id, rest$3);
      } else {
        _block$1 = "";
      }
      let id2 = _block$1;
      let _block$2;
      let $3 = ctx.doc.options.heading_ids;
      if ($3) {
        _block$2 = replace3(ctx.cache.atx_heading_id, rest$3, "");
      } else {
        _block$2 = rest$3;
      }
      let rest$4 = _block$2;
      return advance_line_with_blocks(ctx, prepend(new Heading(num, id2, rest$4, List$Empty$const), ctx.doc.blocks));
    });
  });
}
function collect_list_item(ctx, marker, require_indent) {
  let $ = list_item_line_start(ctx, marker, require_indent);
  let item = $[0];
  let indent = $[1];
  let empty3 = isEqual(item, new Some(""));
  if (item instanceof Some) {
    let first_line = item[0];
    let ctx$1 = advance_line2(ctx);
    let _block;
    if (empty3) {
      _block = take_lines(ctx$1, (line) => {
        let $22 = list_item_line(ctx$1, line, indent, false);
        if ($22 instanceof Some) {
          let $32 = $22[0];
          if ($32 === "") {
            return Option$None$const;
          } else {
            return $22;
          }
        } else {
          return $22;
        }
      });
    } else {
      _block = take_lines_with_state(ctx$1, true, (line, lazy) => {
        let $22 = list_item_line(ctx$1, line, indent, lazy);
        if ($22 instanceof Some) {
          let $32 = $22[0];
          if ($32 === "") {
            return check3(empty3, [Option$None$const, lazy], [new Some(""), false]);
          } else {
            let text4 = $32;
            return [new Some(text4), lazy];
          }
        } else {
          return [Option$None$const, lazy];
        }
      });
    }
    let $1 = _block;
    let ctx$2 = $1[0];
    let lines = $1[1];
    let _block$1;
    let $3 = empty3 && is_blank(ctx$2.state.pos);
    if ($3) {
      _block$1 = [advance_line2(ctx$2), true];
    } else {
      _block$1 = [ctx$2, false];
    }
    let $2 = _block$1;
    let ctx$3 = $2[0];
    let ends_with_blank = $2[1];
    let _block$2;
    if (first_line === "") {
      _block$2 = lines;
    } else {
      _block$2 = prepend(first_line, lines);
    }
    let lines$1 = _block$2;
    let inner_text = join(lines$1, `
`) + `
`;
    let _block$3;
    let _pipe = with_state_reset_blocks(ctx$3, inner_text);
    let _pipe$1 = set_nest_listitem(_pipe, indent);
    _block$3 = parse_blocks(_pipe$1);
    let inner_ctx = _block$3;
    let ends_with_blank$1 = ends_with_blank || item_ends_with_blank(lines$1);
    let blocks = inner_ctx.doc.blocks;
    return [
      merge2(ctx$3, inner_ctx, ctx$3.doc.blocks),
      indent,
      new Some(new ListItem(blocks, ends_with_blank$1, item_contains_blank(blocks)))
    ];
  } else {
    return [ctx, indent, Option$None$const];
  }
}
function do_collect_list_items(loop$ctx, loop$marker, loop$indent, loop$items) {
  while (true) {
    let ctx = loop$ctx;
    let marker = loop$marker;
    let indent = loop$indent;
    let items = loop$items;
    let $ = collect_list_item(ctx, marker, indent);
    let ctx$1 = $[0];
    let new_indent = $[1];
    let item = $[2];
    if (item instanceof Some) {
      let item$1 = item[0];
      loop$ctx = ctx$1;
      loop$marker = marker;
      loop$indent = new_indent;
      loop$items = prepend(item$1, items);
    } else {
      return [ctx$1, items];
    }
  }
}
function collect_list_items(ctx, marker, indent) {
  let $ = do_collect_list_items(ctx, marker, indent, List$Empty$const);
  let ctx$1 = $[0];
  let items = $[1];
  return [
    ctx$1,
    (() => {
      let _pipe = items;
      return reverse(_pipe);
    })()
  ];
}
function try_parse_ordered_list(ctx, cont) {
  return try_or(parse_ordinal_item(ctx.cache.sp_dot_paren, ctx.state.pos), cont, (_use0) => {
    let marker = _use0[0];
    let indent = _use0[1];
    let ordinal = _use0[2];
    let ordinal$1 = check3(ordinal !== 1, new Some(ordinal), Option$None$const);
    let $ = collect_list_items(ctx, marker, indent);
    let ctx$1 = $[0];
    let items = $[1];
    let pack = calculate_list_pack(items);
    return update_blocks(ctx$1, prepend(new OrderedList(pack, items, ordinal$1), ctx$1.doc.blocks));
  });
}
function try_parse_bullet_list(ctx, cont) {
  return try_or(parse_bullet_item(ctx.state.pos), cont, (_use0) => {
    let marker = _use0[0];
    let indent = _use0[1];
    let $ = collect_list_items(ctx, marker, indent);
    let ctx$1 = $[0];
    let items = $[1];
    let pack = calculate_list_pack(items);
    return update_blocks(ctx$1, prepend(new BulletList(pack, items), ctx$1.doc.blocks));
  });
}
function try_parse_blockquote(ctx) {
  let $ = take_lines_with_state(ctx, "", (line, state) => {
    return guard(is_blockquote_line(line), [new Some(line), line], () => {
      let prev = drop_all_blockquote_markers(state);
      return guard(line_is_codeblock(prev), [Option$None$const, line], () => {
        return guard(is_blank(prev), [Option$None$const, line], () => {
          return guard(ctx.cache.is_paragraph_continuation_text(line), [new Some(line), line], () => {
            return [Option$None$const, line];
          });
        });
      });
    });
  });
  let ctx$1 = $[0];
  let lines = $[1];
  let inner_text = join(map2(lines, drop_blockquote_marker), `
`) + `
`;
  let _block;
  let _pipe = with_state_reset_blocks(ctx$1, inner_text);
  let _pipe$1 = set_nest_blockquote(_pipe);
  _block = parse_blocks(_pipe$1);
  let inner_ctx = _block;
  return merge2(ctx$1, inner_ctx, prepend(new BlockQuote(inner_ctx.doc.blocks), ctx$1.doc.blocks));
}
function try_parse_block(ctx) {
  let $ = ctx.state.pos;
  if ($.startsWith("    ")) {
    return try_parse_indented_code(ctx, () => {
      return block_fallback(ctx);
    });
  } else if ($.startsWith("   ")) {
    let rest = $.slice(3);
    let $1 = rest.charCodeAt(0);
    if ($1 === 35) {
      let tail = rest.slice(1);
      return try_parse_atx_heading(ctx, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 96) {
      let fence = "`";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 126) {
      let fence = "~";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 62) {
      return try_parse_blockquote(ctx);
    } else if ($1 === 60) {
      return try_parse_html(advance_pos(ctx, rest), () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 91) {
      let post_bracket = rest.slice(1);
      let link_ctx = advance_pos(ctx, post_bracket);
      return try_parse_footnote(link_ctx, () => {
        return try_parse_link(link_ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 42) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 45) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 95) {
      return try_parse_thematic_break(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 43) {
      return try_parse_bullet_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 9) {
      return try_parse_indented_code(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 48) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 49) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 50) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 51) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 52) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 53) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 54) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 55) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 56) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 57) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else {
      return block_fallback(ctx);
    }
  } else if ($.startsWith("  ")) {
    let rest = $.slice(2);
    let $1 = rest.charCodeAt(0);
    if ($1 === 35) {
      let tail = rest.slice(1);
      return try_parse_atx_heading(ctx, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 96) {
      let fence = "`";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 126) {
      let fence = "~";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 62) {
      return try_parse_blockquote(ctx);
    } else if ($1 === 60) {
      return try_parse_html(advance_pos(ctx, rest), () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 91) {
      let post_bracket = rest.slice(1);
      let link_ctx = advance_pos(ctx, post_bracket);
      return try_parse_footnote(link_ctx, () => {
        return try_parse_link(link_ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 42) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 45) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 95) {
      return try_parse_thematic_break(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 43) {
      return try_parse_bullet_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 9) {
      return try_parse_indented_code(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 48) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 49) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 50) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 51) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 52) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 53) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 54) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 55) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 56) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 57) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else {
      return block_fallback(ctx);
    }
  } else if ($.charCodeAt(0) === 32) {
    let rest = $.slice(1);
    let $1 = rest.charCodeAt(0);
    if ($1 === 35) {
      let tail = rest.slice(1);
      return try_parse_atx_heading(ctx, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 96) {
      let fence = "`";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 126) {
      let fence = "~";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 62) {
      return try_parse_blockquote(ctx);
    } else if ($1 === 60) {
      return try_parse_html(advance_pos(ctx, rest), () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 91) {
      let post_bracket = rest.slice(1);
      let link_ctx = advance_pos(ctx, post_bracket);
      return try_parse_footnote(link_ctx, () => {
        return try_parse_link(link_ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 42) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 45) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 95) {
      return try_parse_thematic_break(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 43) {
      return try_parse_bullet_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 9) {
      return try_parse_indented_code(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 48) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 49) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 50) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 51) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 52) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 53) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 54) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 55) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 56) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 57) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else {
      return block_fallback(ctx);
    }
  } else {
    let rest = $;
    let $1 = rest.charCodeAt(0);
    if ($1 === 35) {
      let tail = rest.slice(1);
      return try_parse_atx_heading(ctx, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 96) {
      let fence = "`";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 126) {
      let fence = "~";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 62) {
      return try_parse_blockquote(ctx);
    } else if ($1 === 60) {
      return try_parse_html(advance_pos(ctx, rest), () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 91) {
      let post_bracket = rest.slice(1);
      let link_ctx = advance_pos(ctx, post_bracket);
      return try_parse_footnote(link_ctx, () => {
        return try_parse_link(link_ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 42) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 45) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if ($1 === 95) {
      return try_parse_thematic_break(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 43) {
      return try_parse_bullet_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 9) {
      return try_parse_indented_code(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 48) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 49) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 50) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 51) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 52) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 53) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 54) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 55) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 56) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if ($1 === 57) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else {
      return block_fallback(ctx);
    }
  }
}
function do_parse_blocks(loop$ctx) {
  while (true) {
    let ctx = loop$ctx;
    let $ = (() => {
      let _pipe = ctx.state;
      return at_eof(_pipe);
    })();
    if ($) {
      return ctx;
    } else {
      let $1 = ctx.nest;
      if ($1 instanceof Empty) {
        let _pipe = ctx;
        let _pipe$1 = try_parse_block(_pipe);
        loop$ctx = _pipe$1;
      } else {
        let indent = $1.head.indent;
        let $2 = is_blank(ctx.state.pos);
        if ($2) {
          let _pipe = advance_pos(ctx, "");
          let _pipe$1 = try_parse_block(_pipe);
          loop$ctx = _pipe$1;
        } else {
          let got_indent = find_indent(ctx.state.pos);
          if (got_indent < indent) {
            return ctx;
          } else {
            let _pipe = advance_pos(ctx, drop_indent(ctx.state.pos, indent));
            let _pipe$1 = try_parse_block(_pipe);
            loop$ctx = _pipe$1;
          }
        }
      }
    }
  }
}
function parse_blocks(ctx) {
  let ctx$1 = do_parse_blocks(ctx);
  return update_blocks(ctx$1, (() => {
    let _pipe = ctx$1.doc.blocks;
    return reverse(_pipe);
  })());
}

// build/dev/javascript/mork/mork/internal/inlines.mjs
var FILEPATH5 = "src\\mork\\internal\\inlines.gleam";

class InlineState extends CustomType {
  constructor(ctx, inlines) {
    super();
    this.ctx = ctx;
    this.inlines = inlines;
  }
}
function consume_delims(ctx, style2, pre_len, post_len, inner) {
  return lazy_guard(pre_len === 0, () => {
    if (post_len === 0) {
      return inner;
    } else {
      return append(inner, toList([new Delim(style2, post_len, false, true)]));
    }
  }, () => {
    return lazy_guard(post_len === 0, () => {
      if (pre_len === 0) {
        return inner;
      } else {
        return prepend(new Delim(style2, pre_len, true, false), inner);
      }
    }, () => {
      let _block;
      let _pipe = new InlineState(ctx, inner);
      _block = resolve_delims(_pipe);
      let state = _block;
      let inner$1 = state.inlines;
      if (style2 === "~") {
        return consume_delims(ctx, style2, pre_len - 2, post_len - 2, toList([new Strikethrough(inner$1)]));
      } else if (style2 === "=") {
        return consume_delims(ctx, style2, pre_len - 2, post_len - 2, toList([new Highlight(inner$1)]));
      } else if (pre_len > 1 && post_len > 1) {
        return consume_delims(ctx, style2, pre_len - 2, post_len - 2, toList([new Strong(inner$1)]));
      } else {
        return consume_delims(ctx, style2, pre_len - 1, post_len - 1, toList([new Emphasis(inner$1)]));
      }
    });
  });
}
function matching_opener(loop$ctx, loop$style, loop$len, loop$acc, loop$rest, loop$strict, loop$resolves) {
  while (true) {
    let ctx = loop$ctx;
    let style2 = loop$style;
    let len = loop$len;
    let acc = loop$acc;
    let rest = loop$rest;
    let strict = loop$strict;
    let resolves = loop$resolves;
    if (rest instanceof Empty) {
      return [List$Empty$const, Option$None$const, acc, resolves];
    } else {
      let $ = rest.head;
      if ($ instanceof Delim) {
        let $1 = $.can_open;
        if ($1) {
          let match_style = $.style;
          let match_len = $.len;
          if (match_style === style2 && (!strict || match_len === len)) {
            let tail = rest.tail;
            let can_close = $.can_close;
            return [
              acc,
              new Some(new Delim(style2, match_len, true, can_close)),
              tail,
              true
            ];
          } else {
            let inline = $;
            let tail = rest.tail;
            loop$ctx = ctx;
            loop$style = style2;
            loop$len = len;
            loop$acc = prepend(inline, acc);
            loop$rest = tail;
            loop$strict = strict;
            loop$resolves = resolves;
          }
        } else {
          let $2 = $.can_close;
          if ($2) {
            let $3 = do_resolve_delims(ctx, rest, List$Empty$const, resolves);
            let new_rest = $3[0];
            let resolves$1 = $3[1];
            if (new_rest instanceof Empty) {
              loop$ctx = ctx;
              loop$style = style2;
              loop$len = len;
              loop$acc = acc;
              loop$rest = new_rest;
              loop$strict = strict;
              loop$resolves = resolves$1;
            } else {
              let $4 = new_rest.head;
              if ($4 instanceof Delim) {
                let $5 = $4.can_open;
                if (!$5) {
                  let $6 = $4.can_close;
                  if ($6) {
                    let new_rest$1 = new_rest.tail;
                    let style$1 = $4.style;
                    let len$1 = $4.len;
                    loop$ctx = ctx;
                    loop$style = style$1;
                    loop$len = len$1;
                    loop$acc = prepend(new Delim(style$1, len$1, false, true), acc);
                    loop$rest = new_rest$1;
                    loop$strict = strict;
                    loop$resolves = resolves$1;
                  } else {
                    loop$ctx = ctx;
                    loop$style = style2;
                    loop$len = len;
                    loop$acc = acc;
                    loop$rest = new_rest;
                    loop$strict = strict;
                    loop$resolves = resolves$1;
                  }
                } else {
                  loop$ctx = ctx;
                  loop$style = style2;
                  loop$len = len;
                  loop$acc = acc;
                  loop$rest = new_rest;
                  loop$strict = strict;
                  loop$resolves = resolves$1;
                }
              } else {
                loop$ctx = ctx;
                loop$style = style2;
                loop$len = len;
                loop$acc = acc;
                loop$rest = new_rest;
                loop$strict = strict;
                loop$resolves = resolves$1;
              }
            }
          } else {
            let inline = $;
            let tail = rest.tail;
            loop$ctx = ctx;
            loop$style = style2;
            loop$len = len;
            loop$acc = prepend(inline, acc);
            loop$rest = tail;
            loop$strict = strict;
            loop$resolves = resolves;
          }
        }
      } else {
        let inline = $;
        let tail = rest.tail;
        loop$ctx = ctx;
        loop$style = style2;
        loop$len = len;
        loop$acc = prepend(inline, acc);
        loop$rest = tail;
        loop$strict = strict;
        loop$resolves = resolves;
      }
    }
  }
}
function do_resolve_delims(loop$ctx, loop$inlines, loop$acc, loop$resolves) {
  while (true) {
    let ctx = loop$ctx;
    let inlines = loop$inlines;
    let acc = loop$acc;
    let resolves = loop$resolves;
    if (inlines instanceof Empty) {
      return [
        (() => {
          let _pipe = acc;
          return reverse(_pipe);
        })(),
        resolves
      ];
    } else {
      let $ = inlines.head;
      if ($ instanceof Delim) {
        let $1 = $.can_close;
        if ($1) {
          let rest = inlines.tail;
          let style2 = $.style;
          let len = $.len;
          let can_open = $.can_open;
          let $2 = matching_opener(ctx, style2, len, List$Empty$const, rest, true, resolves);
          let inner = $2[0];
          let opener = $2[1];
          let tail = $2[2];
          let resolves$1 = $2[3];
          if (opener instanceof Some) {
            let opener$1 = opener[0];
            if (!(opener$1 instanceof Delim)) {
              throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 322, "do_resolve_delims", "Pattern match failed, no pattern matched the value.", {
                value: opener$1,
                start: 10207,
                end: 10236,
                pattern_start: 10218,
                pattern_end: 10227
              });
            }
            loop$ctx = ctx;
            loop$inlines = tail;
            loop$acc = flatten(toList([consume_delims(ctx, style2, opener$1.len, len, inner), acc]));
            loop$resolves = true;
          } else {
            let $3 = matching_opener(ctx, style2, len, List$Empty$const, rest, false, resolves$1);
            let inner$1 = $3[0];
            let opener$1 = $3[1];
            let tail$1 = $3[2];
            let resolves$2 = $3[3];
            if (opener$1 instanceof Some) {
              let opener$2 = opener$1[0];
              if (!(opener$2 instanceof Delim)) {
                throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 338, "do_resolve_delims", "Pattern match failed, no pattern matched the value.", {
                  value: opener$2,
                  start: 10676,
                  end: 10705,
                  pattern_start: 10687,
                  pattern_end: 10696
                });
              }
              loop$ctx = ctx;
              loop$inlines = tail$1;
              loop$acc = flatten(toList([
                consume_delims(ctx, style2, opener$2.len, len, inner$1),
                acc
              ]));
              loop$resolves = true;
            } else {
              loop$ctx = ctx;
              loop$inlines = rest;
              loop$acc = prepend(new Delim(style2, len, can_open, true), acc);
              loop$resolves = resolves$2;
            }
          }
        } else {
          let any2 = $;
          let rest = inlines.tail;
          loop$ctx = ctx;
          loop$inlines = rest;
          loop$acc = prepend(any2, acc);
          loop$resolves = resolves;
        }
      } else {
        let any2 = $;
        let rest = inlines.tail;
        loop$ctx = ctx;
        loop$inlines = rest;
        loop$acc = prepend(any2, acc);
        loop$resolves = resolves;
      }
    }
  }
}
function rec_resolve_delims(loop$state, loop$depth) {
  while (true) {
    let state = loop$state;
    let depth = loop$depth;
    let $ = do_resolve_delims(state.ctx, state.inlines, List$Empty$const, false);
    let inlines = $[0];
    let resolves = $[1];
    if (resolves && depth < 14) {
      loop$state = new InlineState(state.ctx, inlines);
      loop$depth = depth + 1;
    } else {
      return new InlineState(state.ctx, inlines);
    }
  }
}
function resolve_delims(state) {
  return rec_resolve_delims(state, 0);
}
function push_text(text4, inlines) {
  if (text4 === "") {
    return inlines;
  } else {
    return prepend((() => {
      let _pipe = text4;
      return new Text2(_pipe);
    })(), inlines);
  }
}
function is_matched(loop$s, loop$lp, loop$rp) {
  while (true) {
    let s = loop$s;
    let lp = loop$lp;
    let rp = loop$rp;
    let $ = s.charCodeAt(0);
    if ($ === 40) {
      let s$1 = s.slice(1);
      loop$s = s$1;
      loop$lp = lp + 1;
      loop$rp = rp;
    } else if ($ === 41) {
      let s$1 = s.slice(1);
      loop$s = s$1;
      loop$lp = lp;
      loop$rp = rp + 1;
    } else {
      let $1 = pop_grapheme(s);
      if ($1 instanceof Ok) {
        let s$1 = $1[0][1];
        loop$s = s$1;
        loop$lp = lp;
        loop$rp = rp;
      } else {
        return lp === rp;
      }
    }
  }
}
function backtrack_autolink(loop$s, loop$acc) {
  while (true) {
    let s = loop$s;
    let acc = loop$acc;
    let $ = s.charCodeAt(0);
    if ($ === 41) {
      let p2 = ")";
      let rest = s.slice(1);
      let $1 = is_matched(rest, 0, 1);
      if ($1) {
        return [acc, s];
      } else {
        loop$s = rest;
        loop$acc = acc + p2;
      }
    } else if ($ === 59) {
      let p2 = ";";
      let rest = s.slice(1);
      let $1 = from_string("^[A-Za-z0-9]+&");
      let re;
      if ($1 instanceof Ok) {
        re = $1[0];
      } else {
        throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 836, "backtrack_autolink", "Pattern match failed, no pattern matched the value.", {
          value: $1,
          start: 24168,
          end: 24224,
          pattern_start: 24179,
          pattern_end: 24185
        });
      }
      let $2 = check2(re, rest);
      if ($2) {
        let $3 = split_once(rest, "&");
        if ($3 instanceof Ok) {
          let escape2 = $3[0][0];
          let rest$1 = $3[0][1];
          return [acc + p2 + escape2 + "&", rest$1];
        } else {
          return [acc, rest];
        }
      } else {
        loop$s = rest;
        loop$acc = acc + p2;
      }
    } else if ($ === 46) {
      let p2 = ".";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if ($ === 44) {
      let p2 = ",";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if ($ === 33) {
      let p2 = "!";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if ($ === 63) {
      let p2 = "?";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if ($ === 58) {
      let p2 = ":";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if ($ === 42) {
      let p2 = "*";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if ($ === 95) {
      let p2 = "_";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if ($ === 126) {
      let p2 = "~";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else {
      return [acc, s];
    }
  }
}
function parse_autolink_tail(_, rest) {
  let $ = from_string("^[A-Za-z0-9_-]+\\.[A-Za-z0-9.-]+");
  let re;
  if ($ instanceof Ok) {
    re = $[0];
  } else {
    throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 810, "parse_autolink_tail", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 23377,
      end: 23451,
      pattern_start: 23388,
      pattern_end: 23394
    });
  }
  let $1 = check2(re, rest);
  if ($1) {
    let sp = new$5(toList([" ", `\r
`, `
`, "\t", "<"]));
    let $2 = split3(sp, rest);
    let l = $2[0];
    let s = $2[1];
    let r = $2[2];
    let reversed = reverse3(l);
    let $3 = backtrack_autolink(reversed, "");
    let post = $3[0];
    let body = $3[1];
    let body$1 = reverse3(body);
    let post$1 = reverse3(post);
    return [body$1, post$1 + s + r];
  } else {
    return ["", rest];
  }
}
function do_last_char_of(inline) {
  if (inline instanceof Autolink) {
    return ">";
  } else if (inline instanceof CodeSpan) {
    return "`";
  } else if (inline instanceof EmailAutolink) {
    return ">";
  } else if (inline instanceof Emphasis) {
    return "*";
  } else if (inline instanceof Footnote) {
    return "]";
  } else if (inline instanceof FullImage) {
    return "]";
  } else if (inline instanceof FullLink) {
    return "]";
  } else if (inline instanceof HardBreak) {
    return `
`;
  } else if (inline instanceof Highlight) {
    return "=";
  } else if (inline instanceof InlineFootnote) {
    return "]";
  } else if (inline instanceof InlineHtml) {
    return ">";
  } else if (inline instanceof RawHtml) {
    let text4 = inline[0];
    return text4;
  } else if (inline instanceof RefImage) {
    return "]";
  } else if (inline instanceof RefLink) {
    return "]";
  } else if (inline instanceof SoftBreak) {
    return `
`;
  } else if (inline instanceof Strikethrough) {
    return "~";
  } else if (inline instanceof Strong) {
    return "*";
  } else if (inline instanceof Text2) {
    let text4 = inline[0];
    return text4;
  } else if (inline instanceof Checkbox) {
    return "]";
  } else {
    let style2 = inline.style;
    return style2;
  }
}
function last_char_of(inlines) {
  if (inlines instanceof Empty) {
    return "";
  } else {
    let inline = inlines.head;
    return do_last_char_of(inline);
  }
}
function make_break(acc, inlines) {
  let nspaces = count_spaces(reverse3(acc), 0);
  let $ = nspaces >= 2;
  if ($) {
    return prepend(Inline$HardBreak$const, push_text(drop_end(acc, nspaces), inlines));
  } else {
    return prepend(Inline$SoftBreak$const, push_text(trim_end(acc), inlines));
  }
}
function normalize_span(s) {
  let s$1 = replace(s, `
`, " ");
  let $ = starts_with(s$1, " ") && ends_with(s$1, " ") && !is_blank(s$1);
  if ($) {
    let _pipe = s$1;
    let _pipe$1 = drop_start(_pipe, 1);
    return drop_end(_pipe$1, 1);
  } else {
    return s$1;
  }
}
function make_codespan(body) {
  let _pipe = body;
  let _pipe$1 = normalize_span(_pipe);
  return new CodeSpan(_pipe$1);
}
function take_while(haystack, needle) {
  return do_take_while(haystack, needle, "");
}
function parse_link_paren(ctx, in$) {
  let in$1 = gobble_hspace(in$);
  return parse_link_dest(in$1, ctx.cache.sp_link_dest, ctx.cache.sp_link_dest_tag, (dest, in$2) => {
    let in$22 = gobble_hspace(in$2);
    if (in$22.charCodeAt(0) === 41) {
      let rest = in$22.slice(1);
      return new Ok([new LinkData(dest, Option$None$const), rest]);
    } else {
      return parse_link_title(in$22, ctx.cache.sp_link_title, (title2, in$3) => {
        let in$32 = gobble_hspace(in$3);
        if (in$32.charCodeAt(0) === 41) {
          let rest = in$32.slice(1);
          return new Ok([new LinkData(dest, title2), rest]);
        } else {
          return new Error(undefined);
        }
      });
    }
  });
}
function contains_a_link(inlines) {
  if (inlines instanceof Empty) {
    return false;
  } else {
    let inline = inlines.head;
    let rest = inlines.tail;
    return (() => {
      if (inline instanceof Emphasis) {
        let inlines$1 = inline[0];
        return contains_a_link(inlines$1);
      } else if (inline instanceof FullImage) {
        let text4 = inline.text;
        return contains_a_link(text4);
      } else if (inline instanceof FullLink) {
        return true;
      } else if (inline instanceof RefImage) {
        let text4 = inline.text;
        return contains_a_link(text4);
      } else if (inline instanceof RefLink) {
        return true;
      } else if (inline instanceof Strong) {
        let inlines$1 = inline[0];
        return contains_a_link(inlines$1);
      } else {
        return false;
      }
    })() || contains_a_link(rest);
  }
}
function do_split_at_tag(loop$sp, loop$rest, loop$acc, loop$stack) {
  while (true) {
    let sp = loop$sp;
    let rest = loop$rest;
    let acc = loop$acc;
    let stack = loop$stack;
    let $ = split3(sp, rest);
    let l = $[0];
    let s = $[1];
    let r = $[2];
    if (s === "") {
      return [acc + rest, "", ""];
    } else if (s === ">") {
      if (stack instanceof Empty) {
        return [acc + l, ">", r];
      } else {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = acc + l + ">";
        loop$stack = stack;
      }
    } else if (s === '"') {
      if (stack instanceof Empty) {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = acc + l + '"';
        loop$stack = prepend('"', stack);
      } else {
        let $1 = stack.head;
        if ($1 === '"') {
          let stack$1 = stack.tail;
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + '"';
          loop$stack = stack$1;
        } else if ($1 === "'") {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + '"';
          loop$stack = stack;
        } else {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + '"';
          loop$stack = prepend('"', stack);
        }
      }
    } else if (s === "'") {
      if (stack instanceof Empty) {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = acc + l + "'";
        loop$stack = prepend("'", stack);
      } else {
        let $1 = stack.head;
        if ($1 === "'") {
          let stack$1 = stack.tail;
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + "'";
          loop$stack = stack$1;
        } else if ($1 === '"') {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + "'";
          loop$stack = stack;
        } else {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + "'";
          loop$stack = prepend("'", stack);
        }
      }
    } else if (s === "\\") {
      let $1 = pop_grapheme(r);
      if ($1 instanceof Ok) {
        let ch = $1[0][0];
        let tail = $1[0][1];
        if (ch === '"') {
          loop$sp = sp;
          loop$rest = tail;
          loop$acc = acc + l + ch;
          loop$stack = stack;
        } else if (ch === "'") {
          loop$sp = sp;
          loop$rest = tail;
          loop$acc = acc + l + ch;
          loop$stack = stack;
        } else {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + "\\";
          loop$stack = stack;
        }
      } else {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = acc + l + "\\";
        loop$stack = stack;
      }
    } else {
      throw makeError("panic", FILEPATH5, "mork/internal/inlines", 769, "do_split_at_tag", "unreachable", {});
    }
  }
}
function split_at_tag(ctx, s) {
  return do_split_at_tag(ctx.cache.sp_tag, s, "", List$Empty$const);
}
function do_parse_autolink(ctx, scheme, rest, acc, inlines) {
  let _block;
  let $ = acc !== "";
  if ($) {
    _block = slice(acc, string_length(acc) - 1, 1);
  } else {
    _block = last_char_of(inlines);
  }
  let before = _block;
  if (before === "") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === " ") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === `
`) {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "\t") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "\r") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "*") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "_") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "~") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "(") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail = $1[0];
    let rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_raw(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else {
    return do_parse_inlines(with_raw(ctx, rest), acc + scheme, inlines);
  }
}
function parse_delim(ctx, style2, len, acc, inlines) {
  let _block;
  let $ = acc !== "";
  if ($) {
    _block = acc;
  } else {
    _block = last_char_of(inlines);
  }
  let before = _block;
  let rest = ctx.state.start;
  let before_is_ws = ctx.cache.ends_with_ws(before);
  let before_is_p = ctx.cache.ends_with_p(before);
  let after_is_ws = ctx.cache.starts_with_ws(rest);
  let after_is_p = ctx.cache.starts_with_p(rest);
  let left_flanking = !after_is_ws && (!after_is_p || before_is_ws || before_is_p);
  let right_flanking = !before_is_ws && (!before_is_p || after_is_ws || after_is_p);
  let _block$1;
  if (style2 === "_") {
    _block$1 = [
      left_flanking && (!right_flanking || before_is_p),
      right_flanking && (!left_flanking || after_is_p)
    ];
  } else {
    _block$1 = [left_flanking, right_flanking];
  }
  let $1 = _block$1;
  let can_open = $1[0];
  let can_close = $1[1];
  let inlines$1 = push_text(acc, inlines);
  return do_parse_inlines(ctx, "", prepend(new Delim(style2, len, can_open, can_close), inlines$1));
}
function handle_und_emoji(acc, und, r, ctx, inlines) {
  let sp = new$5(toList([":"]));
  let rhead = split_after(sp, reverse3(acc));
  let head = reverse3(rhead[0]);
  let $ = split_after(sp, r);
  let butt = $[0];
  let r2 = $[1];
  let $1 = from_string("^:[A-Za-z_]{1,24}:$");
  let re;
  if ($1 instanceof Ok) {
    re = $1[0];
  } else {
    throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 210, "handle_und_emoji", "Pattern match failed, no pattern matched the value.", {
      value: $1,
      start: 7009,
      end: 7070,
      pattern_start: 7020,
      pattern_end: 7026
    });
  }
  let $2 = check2(re, head + und + butt);
  if ($2) {
    return do_parse_inlines(with_raw(ctx, r2), acc + und + butt, inlines);
  } else {
    let $3 = take_unds_run(r, 1);
    let run2 = $3[0];
    let rest = $3[1];
    return parse_delim(with_raw(ctx, rest), "_", run2, acc, inlines);
  }
}
function do_parse_codespan_end(loop$ctx, loop$runsplit, loop$run, loop$acc, loop$inlines) {
  while (true) {
    let ctx = loop$ctx;
    let runsplit = loop$runsplit;
    let run2 = loop$run;
    let acc = loop$acc;
    let inlines = loop$inlines;
    let $ = split3(runsplit, ctx.state.start);
    let pre2 = $[0];
    let runend = $[1];
    let post = $[2];
    let $1 = runend === "";
    if ($1) {
      return do_parse_inlines(with_raw(ctx, acc + ctx.state.start), run2, inlines);
    } else {
      let $2 = post === "";
      if ($2) {
        return new InlineState(ctx, prepend((() => {
          let _pipe = acc + pre2;
          return make_codespan(_pipe);
        })(), inlines));
      } else {
        let body = acc + pre2;
        let marker = lazy_unwrap(first(run2), () => {
          throw makeError("panic", FILEPATH5, "mork/internal/inlines", 967, "do_parse_codespan_end", "`panic` expression evaluated.", {});
        });
        let $3 = starts_with(post, marker);
        if ($3) {
          let $4 = take_while(post, marker);
          let runrest = $4[0];
          let post$1 = $4[1];
          let acc$1 = body + runend + runrest;
          loop$ctx = with_raw(ctx, post$1);
          loop$runsplit = runsplit;
          loop$run = run2;
          loop$acc = acc$1;
          loop$inlines = inlines;
        } else {
          let $4 = "";
          if (!(body !== $4)) {
            throw makeError("assert", FILEPATH5, "mork/internal/inlines", 982, "do_parse_codespan_end", "Unreachable = empty code", {
              kind: "binary_operator",
              operator: "!=",
              left: {
                kind: "expression",
                value: body,
                start: 28256,
                end: 28260
              },
              right: { kind: "literal", value: $4, start: 28264, end: 28266 },
              start: 28249,
              end: 28266,
              expression_start: 28256
            });
          }
          return do_parse_inlines(with_raw(ctx, post), "", prepend((() => {
            let _pipe = body;
            return make_codespan(_pipe);
          })(), inlines));
        }
      }
    }
  }
}
function do_parse_codespan(ctx, run2, acc, inlines) {
  let _block;
  let $1 = run2 === 1;
  if ($1) {
    _block = ["`", ctx.cache.sp_1backquote];
  } else {
    let runs2 = repeat("`", run2);
    _block = [runs2, new$5(toList([runs2]))];
  }
  let $ = _block;
  let runs = $[0];
  let runsplit = $[1];
  let rest = ctx.state.start;
  return lazy_guard(rest === "", () => {
    return new InlineState(ctx, push_text(acc + runs, inlines));
  }, () => {
    return do_parse_codespan_end(ctx, runsplit, runs, "", push_text(acc, inlines));
  });
}
function link_handle_reference(ctx, start5, rest, acc, text4, inner_inlines, inlines, ref2) {
  let fail = () => {
    let inlines$1 = flatten(toList([
      toList([new Text2("]")]),
      inner_inlines,
      toList([new Text2(start5)]),
      inlines
    ]));
    return do_parse_inlines(ctx, "", inlines$1);
  };
  let _block;
  if (acc === "[") {
    _block = gobble_link_label(ctx.cache.sp_link_label, rest);
  } else if (acc === "[]") {
    _block = [text4, rest];
  } else if (acc === "") {
    _block = [text4, rest];
  } else {
    throw makeError("panic", FILEPATH5, "mork/internal/inlines", 636, "link_handle_reference", "unreachable label case, acc=" + acc, {});
  }
  let $ = _block;
  let raw_label = $[0];
  let rest$1 = $[1];
  return lazy_guard(raw_label === "", fail, () => {
    let _block$1;
    let _pipe = raw_label;
    _block$1 = casefold(_pipe);
    let raw_label$1 = _block$1;
    let link = get(ctx.doc.links, raw_label$1);
    if (link instanceof Ok) {
      return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(ref2((() => {
        let _pipe$1 = inner_inlines;
        return reverse(_pipe$1);
      })(), raw_label$1), inlines));
    } else {
      return fail();
    }
  });
}
function link_handle_parens(ctx, start5, rest, text4, inner_inlines, inlines, ref2, full) {
  let $ = parse_link_paren(ctx, rest);
  if ($ instanceof Ok) {
    let data = $[0][0];
    let rest$1 = $[0][1];
    return do_parse_inlines(with_raw(ctx, rest$1), "", prepend(full((() => {
      let _pipe = inner_inlines;
      return reverse(_pipe);
    })(), data), inlines));
  } else {
    return link_handle_reference(ctx, start5, "(" + rest, "", text4, inner_inlines, inlines, ref2);
  }
}
function parse_common_linkref(ctx, acc, inlines, start5, full, ref2) {
  let stackpos = length(ctx.stack);
  let inlines$1 = push_text(acc, inlines);
  let _block;
  let _pipe = do_parse_inlines(new Context(ctx.cache, ctx.state, prepend("]", ctx.stack), ctx.doc, ctx.nest), "", List$Empty$const);
  _block = resolve_delims(_pipe);
  let inner = _block;
  let $ = gobble_link_label(ctx.cache.sp_link_label, ctx.state.start);
  let text4 = $[0];
  return lazy_guard(length(inner.ctx.stack) !== stackpos, () => {
    return do_parse_inlines(ctx, start5, inlines$1);
  }, () => {
    return lazy_guard(start5 !== "![" && contains_a_link(inner.inlines), () => {
      let inlines$2 = flatten(toList([
        toList([new Text2("]")]),
        inner.inlines,
        toList([new Text2(start5)]),
        inlines$1
      ]));
      return do_parse_inlines(inner.ctx, "", inlines$2);
    }, () => {
      let rest = inner.ctx.state.start;
      let $1 = rest.charCodeAt(0);
      if ($1 === 40) {
        let rest$1 = rest.slice(1);
        return link_handle_parens(inner.ctx, start5, rest$1, text4, inner.inlines, inlines$1, ref2, full);
      } else if (rest.startsWith("[]")) {
        let post = "[]";
        let rest$1 = rest.slice(2);
        return link_handle_reference(inner.ctx, start5, rest$1, post, text4, inner.inlines, inlines$1, ref2);
      } else if ($1 === 91) {
        let post = "[";
        let rest$1 = rest.slice(1);
        return link_handle_reference(inner.ctx, start5, rest$1, post, text4, inner.inlines, inlines$1, ref2);
      } else {
        return link_handle_reference(inner.ctx, start5, rest, "", text4, inner.inlines, inlines$1, ref2);
      }
    });
  });
}
function do_parse_linkref(ctx, acc, inlines) {
  return parse_common_linkref(ctx, acc, inlines, "[", (var0, var1) => {
    return new FullLink(var0, var1);
  }, (var0, var1) => {
    return new RefLink(var0, var1);
  });
}
function do_parse_footnote(ctx, acc, inlines) {
  let start5 = "[^";
  let stackpos = length(ctx.stack);
  let inlines$1 = push_text(acc, inlines);
  return lazy_guard(!ctx.doc.options.footnotes, () => {
    return do_parse_inlines(ctx, start5, inlines$1);
  }, () => {
    let _block;
    let _pipe = do_parse_inlines(new Context(ctx.cache, ctx.state, prepend("]", ctx.stack), ctx.doc, ctx.nest), "", List$Empty$const);
    _block = resolve_delims(_pipe);
    let inner = _block;
    let $ = gobble_link_label(ctx.cache.sp_link_label, ctx.state.start);
    let text4 = $[0];
    return lazy_guard(length(inner.ctx.stack) !== stackpos, () => {
      return do_parse_inlines(ctx, start5, inlines$1);
    }, () => {
      return lazy_guard((() => {
        let $1 = inner.inlines;
        if ($1 instanceof Empty) {
          return true;
        } else {
          let $2 = $1.tail;
          if ($2 instanceof Empty) {
            let $3 = $1.head;
            if ($3 instanceof Text2) {
              return false;
            } else {
              return true;
            }
          } else {
            return true;
          }
        }
      })(), () => {
        let inlines$2 = flatten(toList([
          toList([new Text2("]")]),
          inner.inlines,
          toList([new Text2(start5)]),
          inlines$1
        ]));
        return do_parse_inlines(inner.ctx, "", inlines$2);
      }, () => {
        let rest = inner.ctx.state.start;
        let ctx$1 = inner.ctx;
        let fail = () => {
          let inlines$2 = flatten(toList([
            toList([new Text2("]")]),
            inner.inlines,
            toList([new Text2(start5)]),
            inlines$1
          ]));
          return do_parse_inlines(ctx$1, "", inlines$2);
        };
        let raw_label = text4;
        return lazy_guard(raw_label === "", fail, () => {
          let _block$1;
          let _pipe$1 = raw_label;
          _block$1 = casefold(_pipe$1);
          let raw_label$1 = _block$1;
          let footnote = get(ctx$1.doc.footnotes, raw_label$1);
          if (footnote instanceof Ok) {
            let num = footnote[0].num;
            return do_parse_inlines(with_raw(ctx$1, rest), "", prepend(new Footnote(num, to_string(num)), inlines$1));
          } else {
            return fail();
          }
        });
      });
    });
  });
}
function do_parse_image(ctx, acc, inlines) {
  return parse_common_linkref(ctx, acc, inlines, "![", (var0, var1) => {
    return new FullImage(var0, var1);
  }, (var0, var1) => {
    return new RefImage(var0, var1);
  });
}
function do_parse_inline_html(ctx, acc, inlines) {
  let $ = split_at_tag(ctx, ctx.state.start);
  let html = $[0];
  let gt = $[1];
  let tail = $[2];
  return lazy_guard(gt === "", () => {
    return do_parse_inlines(ctx, acc + "<", inlines);
  }, () => {
    return lazy_guard(check2(ctx.cache.autolink, html), () => {
      return do_parse_inlines(with_raw(ctx, tail), "", prepend(new Autolink(html, Option$None$const), push_text(acc, inlines)));
    }, () => {
      return lazy_guard(check2(ctx.cache.email_autolink, html), () => {
        return do_parse_inlines(with_raw(ctx, tail), "", prepend(new EmailAutolink(html), prepend(new Text2(acc), inlines)));
      }, () => {
        return lazy_guard(ctx.cache.is_a_html_tag("<" + html + ">", false, false), () => {
          return do_parse_inlines(with_raw(ctx, tail), "", prepend(new RawHtml("<" + html + ">"), prepend(new Text2(acc), inlines)));
        }, () => {
          let $1 = html.charCodeAt(0);
          if (html === "![CDATA[") {
            let $2 = split_once(tail, "]]>");
            if ($2 instanceof Ok) {
              let bod = $2[0][0];
              let tail$1 = $2[0][1];
              return do_parse_inlines(with_raw(ctx, tail$1), "", prepend(new RawHtml("<" + html + ">" + bod + "]]>"), prepend(new Text2(acc), inlines)));
            } else {
              return do_parse_inlines(ctx, acc + "<", inlines);
            }
          } else if ($1 === 33) {
            return do_parse_inlines(with_raw(ctx, tail), "", prepend(new RawHtml("<" + html + ">"), prepend(new Text2(acc), inlines)));
          } else if ($1 === 63) {
            return do_parse_inlines(with_raw(ctx, tail), "", prepend(new RawHtml("<" + html + ">"), prepend(new Text2(acc), inlines)));
          } else {
            return do_parse_inlines(ctx, acc + "<", inlines);
          }
        });
      });
    });
  });
}
function do_inline_escape(ctx, acc, inlines) {
  let $ = ctx.state.start;
  let $1 = $.charCodeAt(0);
  if ($ === "") {
    return new InlineState(ctx, prepend(new Text2(acc + "\\"), inlines));
  } else if ($1 === 34) {
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + "\\\"", inlines);
  } else if ($1 === 38) {
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + "\\&", inlines);
  } else if ($1 === 60) {
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + "\\<", inlines);
  } else if ($1 === 62) {
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + "\\>", inlines);
  } else if ($1 === 92) {
    let ch = "\\";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 33) {
    let ch = "!";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 35) {
    let ch = "#";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 36) {
    let ch = "$";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 37) {
    let ch = "%";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 39) {
    let ch = "'";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 40) {
    let ch = "(";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 41) {
    let ch = ")";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 42) {
    let ch = "*";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 43) {
    let ch = "+";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 44) {
    let ch = ",";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 45) {
    let ch = "-";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 46) {
    let ch = ".";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 47) {
    let ch = "/";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 58) {
    let ch = ":";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 59) {
    let ch = ";";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 61) {
    let ch = "=";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 63) {
    let ch = "?";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 64) {
    let ch = "@";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 91) {
    let ch = "[";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 93) {
    let ch = "]";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 94) {
    let ch = "^";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 95) {
    let ch = "_";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 96) {
    let ch = "`";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 123) {
    let ch = "{";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 124) {
    let ch = "|";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 125) {
    let ch = "}";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 126) {
    let ch = "~";
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), acc + ch, inlines);
  } else if ($1 === 10) {
    let rest = $.slice(1);
    return do_parse_inlines(with_raw(ctx, rest), "", prepend(Inline$HardBreak$const, push_text(acc, inlines)));
  } else {
    return do_parse_inlines(ctx, acc + "\\", inlines);
  }
}
function do_parse_inlines(loop$ctx, loop$acc, loop$inlines) {
  while (true) {
    let ctx = loop$ctx;
    let acc = loop$acc;
    let inlines = loop$inlines;
    let $ = split3(ctx.cache.sp_inline, ctx.state.start);
    let l = $[0];
    let sep = $[1];
    let r = $[2];
    let acc$1 = acc + l;
    if (sep === "") {
      return new InlineState(ctx, push_text(acc$1, inlines));
    } else if (sep === ">") {
      let ch = sep;
      loop$ctx = with_raw(ctx, r);
      loop$acc = acc$1 + ch;
      loop$inlines = inlines;
    } else if (sep === "&") {
      let ch = sep;
      loop$ctx = with_raw(ctx, r);
      loop$acc = acc$1 + ch;
      loop$inlines = inlines;
    } else if (sep === '"') {
      let ch = sep;
      loop$ctx = with_raw(ctx, r);
      loop$acc = acc$1 + ch;
      loop$inlines = inlines;
    } else if (sep === "\\") {
      return do_inline_escape(with_raw(ctx, r), acc$1, inlines);
    } else if (sep === "<") {
      return do_parse_inline_html(with_raw(ctx, r), acc$1, inlines);
    } else if (sep === "![") {
      return do_parse_image(with_raw(ctx, r), acc$1, inlines);
    } else if (sep === "[^") {
      return do_parse_footnote(with_raw(ctx, r), acc$1, inlines);
    } else if (sep === "[") {
      return do_parse_linkref(with_raw(ctx, r), acc$1, inlines);
    } else if (sep === "`") {
      let $1 = take_quot_run(r, 1);
      let run2 = $1[0];
      let rest = $1[1];
      return do_parse_codespan(with_raw(ctx, rest), run2, acc$1, inlines);
    } else if (sep === "*") {
      let $1 = take_star_run(r, 1);
      let run2 = $1[0];
      let rest = $1[1];
      return parse_delim(with_raw(ctx, rest), "*", run2, acc$1, inlines);
    } else if (sep === "_") {
      let $1 = ctx.doc.options.emojis && contains_string(acc$1, ":");
      if ($1) {
        return handle_und_emoji(acc$1, "_", r, ctx, inlines);
      } else {
        let $2 = take_unds_run(r, 1);
        let run2 = $2[0];
        let rest = $2[1];
        return parse_delim(with_raw(ctx, rest), "_", run2, acc$1, inlines);
      }
    } else if (sep === "~~") {
      let $1 = ends_with(l, "~") || starts_with(r, "~");
      if ($1) {
        loop$ctx = with_raw(ctx, r);
        loop$acc = acc$1 + "~~";
        loop$inlines = inlines;
      } else {
        return parse_delim(with_raw(ctx, r), "~", 2, acc$1, inlines);
      }
    } else if (sep === "==") {
      let $1 = ends_with(l, "=") || starts_with(r, "=");
      if ($1) {
        loop$ctx = with_raw(ctx, r);
        loop$acc = acc$1 + "==";
        loop$inlines = inlines;
      } else {
        return parse_delim(with_raw(ctx, r), "=", 2, acc$1, inlines);
      }
    } else if (sep === `
`) {
      loop$ctx = with_raw(ctx, r);
      loop$acc = "";
      loop$inlines = make_break(acc$1, inlines);
    } else if (sep === "]") {
      let $1 = ctx.stack;
      if ($1 instanceof Empty) {
        loop$ctx = with_raw(ctx, r);
        loop$acc = acc$1 + "]";
        loop$inlines = inlines;
      } else {
        let $2 = $1.head;
        if ($2 === "]") {
          let stack = $1.tail;
          let ctx$1 = new Context(ctx.cache, new_state(r, ctx.cache.sp_line), stack, ctx.doc, ctx.nest);
          return new InlineState(ctx$1, push_text(acc$1, inlines));
        } else {
          throw makeError("panic", FILEPATH5, "mork/internal/inlines", 184, "do_parse_inlines", "non-bracket on the stack", {});
        }
      }
    } else if (sep === "https://") {
      let $1 = ctx.doc.options.autolinks;
      if ($1) {
        return do_parse_autolink(ctx, sep, r, acc$1, inlines);
      } else {
        loop$ctx = with_raw(ctx, r);
        loop$acc = acc$1 + sep;
        loop$inlines = inlines;
      }
    } else if (sep === "http://") {
      let $1 = ctx.doc.options.autolinks;
      if ($1) {
        return do_parse_autolink(ctx, sep, r, acc$1, inlines);
      } else {
        loop$ctx = with_raw(ctx, r);
        loop$acc = acc$1 + sep;
        loop$inlines = inlines;
      }
    } else if (sep === "www.") {
      let $1 = ctx.doc.options.autolinks;
      if ($1) {
        return do_parse_autolink(ctx, sep, r, acc$1, inlines);
      } else {
        loop$ctx = with_raw(ctx, r);
        loop$acc = acc$1 + sep;
        loop$inlines = inlines;
      }
    } else {
      throw makeError("panic", FILEPATH5, "mork/internal/inlines", 191, "do_parse_inlines", "unimplemented inline: " + sep, {});
    }
  }
}
function do_inlines(ctx, text4) {
  let _pipe = do_parse_inlines(with_raw(ctx, text4), "", List$Empty$const);
  let _pipe$1 = resolve_delims(_pipe);
  let _pipe$2 = ((state) => {
    return state.inlines;
  })(_pipe$1);
  return reverse(_pipe$2);
}
function try_parse_checkbox(raw) {
  let raw$1 = gobble_hspace(raw);
  return try_pop("[", raw$1, (raw2) => {
    if (raw2.startsWith(" ]")) {
      let rest = raw2.slice(2);
      return new Ok([new Checkbox(false), rest]);
    } else if (raw2.startsWith("x]")) {
      let rest = raw2.slice(2);
      return new Ok([new Checkbox(true), rest]);
    } else {
      return new Error(undefined);
    }
  });
}
function do_checkbox_inlines(ctx, raw) {
  let $ = try_parse_checkbox(raw);
  if ($ instanceof Ok) {
    let checkbox = $[0][0];
    let raw$1 = $[0][1];
    return prepend(checkbox, do_inlines(ctx, raw$1));
  } else {
    return do_inlines(ctx, raw);
  }
}
function do_item_blocks(ctx, blocks) {
  let $ = ctx.doc.options.tasklists;
  if ($) {
    if (blocks instanceof Empty) {
      return map2(blocks, (_capture) => {
        return parse_block_inlines(ctx, _capture);
      });
    } else {
      let $1 = blocks.head;
      if ($1 instanceof Paragraph) {
        let blocks$1 = blocks.tail;
        let raw = $1.raw;
        let first2 = new Paragraph("", do_checkbox_inlines(ctx, raw));
        let rest = map2(blocks$1, (_capture) => {
          return parse_block_inlines(ctx, _capture);
        });
        return prepend2(rest, first2);
      } else {
        return map2(blocks, (_capture) => {
          return parse_block_inlines(ctx, _capture);
        });
      }
    }
  } else {
    return map2(blocks, (_capture) => {
      return parse_block_inlines(ctx, _capture);
    });
  }
}
function parse_block_inlines(ctx, block) {
  if (block instanceof BlockQuote) {
    let blocks = block.blocks;
    return new BlockQuote(map2(blocks, (_capture) => {
      return parse_block_inlines(ctx, _capture);
    }));
  } else if (block instanceof BulletList) {
    let pack = block.pack;
    let items = block.items;
    return new BulletList(pack, map2(items, (item) => {
      return new ListItem(do_item_blocks(ctx, item.blocks), item.ends_with_blank, item.contains_blank);
    }));
  } else if (block instanceof Heading) {
    let level = block.level;
    let id2 = block.id;
    let raw = block.raw;
    return new Heading(level, id2, "", do_inlines(ctx, raw));
  } else if (block instanceof OrderedList) {
    let pack = block.pack;
    let items = block.items;
    let start5 = block.start;
    return new OrderedList(pack, map2(items, (item) => {
      return new ListItem(do_item_blocks(ctx, item.blocks), item.ends_with_blank, item.contains_blank);
    }), start5);
  } else if (block instanceof Paragraph) {
    let raw = block.raw;
    return new Paragraph("", do_inlines(ctx, raw));
  } else if (block instanceof Table) {
    let header = block.header;
    let rows = block.rows;
    return new Table(map2(header, (head) => {
      return new THead(head.align, "", do_inlines(ctx, head.raw));
    }), map2(rows, (_capture) => {
      return map2(_capture, (cell) => {
        return new Cell("", do_inlines(ctx, cell.raw));
      });
    }));
  } else {
    return block;
  }
}
function parse_footnote_blocks(ctx, data) {
  return new FootnoteData(data.num, map2(data.blocks, (_capture) => {
    return parse_block_inlines(ctx, _capture);
  }));
}
function process_inlines(ctx) {
  let blocks = map2(ctx.doc.blocks, (_capture) => {
    return parse_block_inlines(ctx, _capture);
  });
  let _block;
  let $ = ctx.doc.options.footnotes;
  if ($) {
    _block = map(ctx.doc.footnotes, (_, v) => {
      return parse_footnote_blocks(ctx, v);
    });
  } else {
    _block = ctx.doc.footnotes;
  }
  let footnotes = _block;
  let _record = ctx.doc;
  return new Document(_record.options, blocks, _record.links, footnotes);
}

// build/dev/javascript/mork/mork.mjs
function configure2() {
  return new Options(false, true, false, false, false, false, false);
}
function heading_ids(opt, heading_ids2) {
  return new Options(opt.strip_frontmatter, opt.footnotes, heading_ids2, opt.tables, opt.tasklists, opt.emojis, opt.autolinks);
}
function split_frontmatter_from_input(input2) {
  let fms = new$5(toList([`---
`, `---\r
`]));
  let $ = split3(fms, input2);
  let nothing = $[0];
  let start5 = $[1];
  let rest = $[2];
  let $1 = nothing !== "" || start5 === "";
  if ($1) {
    return ["", input2];
  } else {
    let $2 = split3(fms, rest);
    let frontmatter = $2[0];
    let end = $2[1];
    let rest$1 = $2[2];
    if (end === "") {
      return ["", input2];
    } else {
      return [frontmatter, rest$1];
    }
  }
}
function parse_with_options(options, input2) {
  let _block;
  let $ = options.strip_frontmatter;
  if ($) {
    _block = split_frontmatter_from_input(input2)[1];
  } else {
    _block = input2;
  }
  let input$1 = _block;
  let _pipe = options;
  let _pipe$1 = from_string2(_pipe, input$1);
  let _pipe$2 = parse_blocks(_pipe$1);
  return process_inlines(_pipe$2);
}
// build/dev/javascript/maud/maud/components.mjs
class Left2 extends CustomType {
}
var Alignment$Left$const2 = new Left2;
class Center2 extends CustomType {
}
var Alignment$Center$const2 = new Center2;
class Right2 extends CustomType {
}
var Alignment$Right$const2 = new Right2;
class Components extends CustomType {
  constructor(a2, blockquote2, checkbox, code2, del2, em2, footnote, h12, h22, h32, h42, h52, h62, hr2, img2, li2, mark2, ol2, p2, pre2, strong2, table2, tbody2, td2, th2, thead2, tr2, ul2) {
    super();
    this.a = a2;
    this.blockquote = blockquote2;
    this.checkbox = checkbox;
    this.code = code2;
    this.del = del2;
    this.em = em2;
    this.footnote = footnote;
    this.h1 = h12;
    this.h2 = h22;
    this.h3 = h32;
    this.h4 = h42;
    this.h5 = h52;
    this.h6 = h62;
    this.hr = hr2;
    this.img = img2;
    this.li = li2;
    this.mark = mark2;
    this.ol = ol2;
    this.p = p2;
    this.pre = pre2;
    this.strong = strong2;
    this.table = table2;
    this.tbody = tbody2;
    this.td = td2;
    this.th = th2;
    this.thead = thead2;
    this.tr = tr2;
    this.ul = ul2;
  }
}
function default_view(view) {
  return (children) => {
    return view(List$Empty$const, children);
  };
}
function aligned_cell_view(view) {
  return (alignment, children) => {
    let _block;
    if (alignment instanceof Left2) {
      _block = "left";
    } else if (alignment instanceof Center2) {
      _block = "center";
    } else {
      _block = "right";
    }
    let align_value = _block;
    return view(toList([style("text-align", align_value)]), children);
  };
}
function dict_to_attributes(attributes) {
  let _pipe = attributes;
  let _pipe$1 = to_list(_pipe);
  return map2(_pipe$1, (pair) => {
    return attribute2(pair[0], pair[1]);
  });
}
function attributed_view(view) {
  return (attributes, children) => {
    return view(dict_to_attributes(attributes), children);
  };
}
function heading_view(view) {
  return (attributes, id2, children) => {
    let attrs = dict_to_attributes(attributes);
    if (id2 === "") {
      return view(attrs, children);
    } else {
      return view(prepend(id(id2), attrs), children);
    }
  };
}
function default$() {
  return new Components((attributes, href2, title2, children) => {
    let _block;
    if (title2 instanceof Some) {
      let t = title2[0];
      _block = toList([title(t)]);
    } else {
      _block = List$Empty$const;
    }
    let title_attr = _block;
    let attrs = dict_to_attributes(attributes);
    return a(prepend(href(href2), append(title_attr, attrs)), children);
  }, attributed_view(blockquote), (checked2) => {
    let _block;
    if (checked2) {
      _block = toList([
        type_("checkbox"),
        checked(true),
        disabled(true)
      ]);
    } else {
      _block = toList([
        type_("checkbox"),
        disabled(true)
      ]);
    }
    let attrs = _block;
    return input(attrs);
  }, (attributes, language, children) => {
    let attrs = dict_to_attributes(attributes);
    if (language instanceof Some) {
      let lang = language[0];
      return code(prepend(class$("language-" + lang), attrs), children);
    } else {
      return code(attrs, children);
    }
  }, default_view(del), default_view(em), (num, children) => {
    return sup(List$Empty$const, toList([
      a(toList([id("fnref-" + to_string(num))]), children)
    ]));
  }, heading_view(h1), heading_view(h2), heading_view(h3), heading_view(h4), heading_view(h5), heading_view(h6), () => {
    return hr(List$Empty$const);
  }, (attributes, uri, alt2, title2) => {
    let _block;
    if (alt2 === "") {
      _block = List$Empty$const;
    } else {
      _block = toList([alt(alt2)]);
    }
    let alt_attr = _block;
    let _block$1;
    if (title2 instanceof Some) {
      let t = title2[0];
      _block$1 = toList([title(t)]);
    } else {
      _block$1 = List$Empty$const;
    }
    let title_attr = _block$1;
    return img(flatten(toList([
      toList([src(uri)]),
      alt_attr,
      title_attr,
      dict_to_attributes(attributes)
    ])));
  }, default_view(li), default_view(mark), (start5, children) => {
    if (start5 instanceof Some) {
      let s = start5[0];
      return ol(toList([attribute2("start", to_string(s))]), children);
    } else {
      return ol(List$Empty$const, children);
    }
  }, attributed_view(p), attributed_view(pre), default_view(strong), default_view(table), default_view(tbody), aligned_cell_view(td), aligned_cell_view(th), default_view(thead), default_view(tr), default_view(ul));
}
function a2(components, view) {
  return new Components(view, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function blockquote2(components, blockquote3) {
  return new Components(components.a, blockquote3, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function code2(components, code3) {
  return new Components(components.a, components.blockquote, components.checkbox, code3, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function h12(components, h13) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, h13, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function h22(components, h23) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, h23, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function h32(components, h33) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, h33, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function h42(components, h43) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, h43, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function h52(components, h53) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, h53, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function h62(components, h63) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, h63, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function hr2(components, hr3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, hr3, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function img2(components, img3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, img3, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function li2(components, li3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, li3, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function p2(components, p3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, p3, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function pre2(components, pre3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, pre3, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function table2(components, table3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, table3, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function td2(components, td3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, td3, components.th, components.thead, components.tr, components.ul);
}
function th2(components, th3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, th3, components.thead, components.tr, components.ul);
}
function tr2(components, tr3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, components.img, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, tr3, components.ul);
}

// build/dev/javascript/maud/maud/internal/render.mjs
function render_thematic_break(components) {
  return components.hr();
}
function render_checkbox(checked2, components) {
  return components.checkbox(checked2);
}
function src2(destination) {
  if (destination instanceof Absolute) {
    let uri = destination.uri;
    return uri;
  } else if (destination instanceof Relative) {
    let uri = destination.uri;
    return uri;
  } else {
    let anchor = destination.id;
    return "#" + percent_encode(anchor);
  }
}
function inlines_to_text(inlines) {
  let _pipe = inlines;
  let _pipe$1 = map2(_pipe, (inline) => {
    if (inline instanceof CodeSpan) {
      let text4 = inline[0];
      return text4;
    } else if (inline instanceof Emphasis) {
      let inner = inline[0];
      return inlines_to_text(inner);
    } else if (inline instanceof HardBreak) {
      return " ";
    } else if (inline instanceof Highlight) {
      let inner = inline[0];
      return inlines_to_text(inner);
    } else if (inline instanceof SoftBreak) {
      return " ";
    } else if (inline instanceof Strikethrough) {
      let inner = inline[0];
      return inlines_to_text(inner);
    } else if (inline instanceof Strong) {
      let inner = inline[0];
      return inlines_to_text(inner);
    } else if (inline instanceof Text2) {
      let text4 = inline[0];
      return text4;
    } else {
      return "";
    }
  });
  return concat2(_pipe$1);
}
function render_img(inlines, link_data, _, components) {
  let uri = src2(link_data.dest);
  let alt2 = inlines_to_text(inlines);
  return components.img(make(), uri, alt2, link_data.title);
}
function html_attributes(attributes) {
  let _pipe = attributes;
  let _pipe$1 = to_list(_pipe);
  return map2(_pipe$1, (pair) => {
    return attribute2(pair[0], pair[1]);
  });
}
function render_footnote(num, children, components) {
  return components.footnote(num, children);
}
function render_autolink(uri, text4, components) {
  return components.a(make(), uri, Option$None$const, toList([text2(unwrap(text4, uri))]));
}
function render_strong(inlines, document2, components) {
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return components.strong(_pipe$1);
}
function render_strikethrough(inlines, document2, components) {
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return components.del(_pipe$1);
}
function render_a(inlines, link_data, document2, components) {
  let href2 = src2(link_data.dest);
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return ((children) => {
    return components.a(make(), href2, link_data.title, children);
  })(_pipe$1);
}
function render_inline_html(tag, attributes, children, document2, components) {
  return element2(tag, html_attributes(attributes), render_inlines(children, document2, components));
}
function render_highlight(inlines, document2, components) {
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return components.mark(_pipe$1);
}
function render_emphasis(inlines, document2, components) {
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return components.em(_pipe$1);
}
function render_inline(document2, inline, components) {
  if (inline instanceof Autolink) {
    let uri = inline.uri;
    let text4 = inline.text;
    return render_autolink(uri, text4, components);
  } else if (inline instanceof CodeSpan) {
    let text4 = inline[0];
    return components.code(make(), Option$None$const, toList([text2(text4)]));
  } else if (inline instanceof EmailAutolink) {
    let email = inline.mail;
    return render_autolink("mailto:" + email, new Some(email), components);
  } else if (inline instanceof Emphasis) {
    let inlines = inline[0];
    return render_emphasis(inlines, document2, components);
  } else if (inline instanceof Footnote) {
    let num = inline.num;
    let label = inline.label;
    return render_footnote(num, toList([text2(label)]), components);
  } else if (inline instanceof FullImage) {
    let inlines = inline.text;
    let image = inline.data;
    return render_img(inlines, image, document2, components);
  } else if (inline instanceof FullLink) {
    let inlines = inline.text;
    let link_data = inline.data;
    return render_a(inlines, link_data, document2, components);
  } else if (inline instanceof HardBreak) {
    return br(List$Empty$const);
  } else if (inline instanceof Highlight) {
    let inlines = inline[0];
    return render_highlight(inlines, document2, components);
  } else if (inline instanceof InlineFootnote) {
    let num = inline.num;
    let inlines = inline.text;
    return render_footnote(num, render_inlines(inlines, document2, components), components);
  } else if (inline instanceof InlineHtml) {
    let tag = inline.tag;
    let attributes = inline.attrs;
    let inlines = inline.children;
    return render_inline_html(tag, attributes, inlines, document2, components);
  } else if (inline instanceof RawHtml) {
    return none2();
  } else if (inline instanceof RefImage) {
    let inlines = inline.text;
    let label = inline.label;
    let $ = get(document2.links, label);
    if ($ instanceof Ok) {
      let link_data = $[0];
      return render_img(inlines, link_data, document2, components);
    } else {
      return render_img(inlines, new LinkData(new Absolute(""), Option$None$const), document2, components);
    }
  } else if (inline instanceof RefLink) {
    let inlines = inline.text;
    let label = inline.label;
    let $ = get(document2.links, label);
    if ($ instanceof Ok) {
      let link_data = $[0];
      return render_a(inlines, link_data, document2, components);
    } else {
      return render_a(inlines, new LinkData(new Absolute(""), Option$None$const), document2, components);
    }
  } else if (inline instanceof SoftBreak) {
    return text2(`
`);
  } else if (inline instanceof Strikethrough) {
    let inlines = inline[0];
    return render_strikethrough(inlines, document2, components);
  } else if (inline instanceof Strong) {
    let inlines = inline[0];
    return render_strong(inlines, document2, components);
  } else if (inline instanceof Text2) {
    let text4 = inline[0];
    return text2(text4);
  } else if (inline instanceof Checkbox) {
    let checked2 = inline.checked;
    return render_checkbox(checked2, components);
  } else {
    let style2 = inline.style;
    let len = inline.len;
    return text2(repeat(style2, len));
  }
}
function render_inlines(inlines, document2, components) {
  return map2(inlines, (inline) => {
    return render_inline(document2, inline, components);
  });
}
function mork_alignment_to_alignment(alignment) {
  if (alignment instanceof Left) {
    return Alignment$Left$const2;
  } else if (alignment instanceof Right) {
    return Alignment$Right$const2;
  } else {
    return Alignment$Center$const2;
  }
}
function render_td(alignment, items, document2, components) {
  let align = mork_alignment_to_alignment(alignment);
  let children = render_inlines(items, document2, components);
  return components.td(align, children);
}
function render_tr(cells, aligns, document2, components) {
  let _pipe = cells;
  let _pipe$1 = zip(_pipe, aligns);
  let _pipe$2 = map2(_pipe$1, (pair) => {
    let cell = pair[0];
    let align = pair[1];
    return render_td(align, cell.inlines, document2, components);
  });
  return components.tr(_pipe$2);
}
function render_tbody(rows, aligns, document2, components) {
  let _pipe = rows;
  let _pipe$1 = map2(_pipe, (cells) => {
    return render_tr(cells, aligns, document2, components);
  });
  return components.tbody(_pipe$1);
}
function render_th(alignment, items, document2, components) {
  let align = mork_alignment_to_alignment(alignment);
  let children = render_inlines(items, document2, components);
  return components.th(align, children);
}
function render_thead(headers, document2, components) {
  let _pipe = headers;
  let _pipe$1 = map2(_pipe, (header) => {
    return render_th(header.align, header.inlines, document2, components);
  });
  let _pipe$2 = components.tr(_pipe$1);
  return ((row) => {
    return components.thead(toList([row]));
  })(_pipe$2);
}
function render_table(header, rows, document2, components) {
  let thead2 = render_thead(header, document2, components);
  let aligns = map2(header, (head) => {
    return head.align;
  });
  let tbody2 = render_tbody(rows, aligns, document2, components);
  return components.table(toList([thead2, tbody2]));
}
function render_paragraph(pack, inlines, document2, components) {
  let text4 = render_inlines(inlines, document2, components);
  if (pack instanceof Loose) {
    return components.p(make(), text4);
  } else {
    return fragment2(text4);
  }
}
function render_heading(level, id2, inlines, document2, components) {
  let children = render_inlines(inlines, document2, components);
  let attributes = make();
  if (level === 1) {
    return components.h1(attributes, id2, children);
  } else if (level === 2) {
    return components.h2(attributes, id2, children);
  } else if (level === 3) {
    return components.h3(attributes, id2, children);
  } else if (level === 4) {
    return components.h4(attributes, id2, children);
  } else if (level === 5) {
    return components.h5(attributes, id2, children);
  } else {
    return components.h6(attributes, id2, children);
  }
}
function render_pre(language, text4, components) {
  return components.pre(make(), toList([
    components.code(make(), language, toList([text2(text4)]))
  ]));
}
function render_list_item(list_item, pack, document2, components) {
  let _pipe = list_item.blocks;
  let _pipe$1 = flat_map(_pipe, (block) => {
    if (pack instanceof Tight && block instanceof Paragraph) {
      let inlines = block.inlines;
      return render_inlines(inlines, document2, components);
    } else {
      return toList([render_block(block, document2, components, pack)]);
    }
  });
  return components.li(_pipe$1);
}
function render_ol(start5, pack, items, document2, components) {
  let _block;
  let _pipe = items;
  _block = map2(_pipe, (item) => {
    return render_list_item(item, pack, document2, components);
  });
  let children = _block;
  return components.ol(start5, children);
}
function render_ul(pack, items, document2, components) {
  let _pipe = items;
  let _pipe$1 = map2(_pipe, (item) => {
    return render_list_item(item, pack, document2, components);
  });
  return components.ul(_pipe$1);
}
function render_blockquote(blocks, document2, components) {
  let children = render_blocks(blocks, document2, components);
  return components.blockquote(make(), children);
}
function render_block(block, document2, components, pack) {
  if (block instanceof BlockQuote) {
    let blocks = block.blocks;
    return render_blockquote(blocks, document2, components);
  } else if (block instanceof BulletList) {
    let pack$1 = block.pack;
    let items = block.items;
    return render_ul(pack$1, items, document2, components);
  } else if (block instanceof Code) {
    let lang = block.lang;
    let text4 = block.text;
    return render_pre(lang, text4, components);
  } else if (block instanceof Empty2) {
    return none2();
  } else if (block instanceof Heading) {
    let level = block.level;
    let id2 = block.id;
    let inlines = block.inlines;
    return render_heading(level, id2, inlines, document2, components);
  } else if (block instanceof HtmlBlock) {
    let raw = block.raw;
    return unsafe_raw_html("", "div", List$Empty$const, raw);
  } else if (block instanceof Newline) {
    return none2();
  } else if (block instanceof OrderedList) {
    let pack$1 = block.pack;
    let items = block.items;
    let start5 = block.start;
    return render_ol(start5, pack$1, items, document2, components);
  } else if (block instanceof Paragraph) {
    let inlines = block.inlines;
    return render_paragraph(pack, inlines, document2, components);
  } else if (block instanceof Table) {
    let header = block.header;
    let rows = block.rows;
    return render_table(header, rows, document2, components);
  } else {
    return render_thematic_break(components);
  }
}
function render_blocks(blocks, document2, components) {
  return map2(blocks, (block) => {
    return render_block(block, document2, components, ListPack$Loose$const);
  });
}
function footnote(acc, document2, components) {
  let _pipe = document2.footnotes;
  let _pipe$1 = to_list(_pipe);
  let _pipe$2 = sort(_pipe$1, (a3, b) => {
    return compare2(a3[0], b[0]);
  });
  let _pipe$3 = map2(_pipe$2, (tup) => {
    return tup[1];
  });
  let _pipe$4 = flat_map(_pipe$3, (doc) => {
    return render_blocks(doc.blocks, document2, components);
  });
  return ((footnotes) => {
    return append(acc, footnotes);
  })(_pipe$4);
}

// build/dev/javascript/maud/maud.mjs
function render_document(document2, components) {
  let _pipe = render_blocks(document2.blocks, document2, components);
  return footnote(_pipe, document2, components);
}
function render_markdown(markdown, render_options, components) {
  let _pipe = render_options;
  let _pipe$1 = parse_with_options(_pipe, markdown);
  return render_document(_pipe$1, components);
}
// build/dev/javascript/index/components/global_bg.mjs
var css = `
:root {
  scroll-timeline-name: --bg-scroll;
  scroll-timeline-axis: block;
}
#bg {
  pointer-events: none;
  --bg-gap: 0.2em;
  --bg-black: calc(1em - var(--bg-gap));
  --bg-inset: calc(var(--bg-gap) / 2);
}
#bg::before,
#bg::after {
  content: "";
  position: fixed;
  z-index: -1;
  top: 50%;
  left: 50%;
  width: 200vmax;
  height: 200vmax;
  transform: translate(-50%, -50%) rotate(45deg);
  pointer-events: none;
  background-image:
    conic-gradient(
      from 270deg at var(--bg-black) var(--bg-black),
      var(--bg-color, #1111) 0deg 90deg,
      transparent 90deg
    ),
    conic-gradient(
      from 270deg at var(--bg-black) var(--bg-black),
      var(--bg-color, #1111) 0deg 90deg,
      transparent 90deg
    );
  background-size: 2em 2em;
  background-position:
    var(--bg-inset) var(--bg-inset),
    calc(1em + var(--bg-inset)) calc(1em + var(--bg-inset));
  background-repeat: repeat;
  animation-duration: auto;
  animation-timing-function: linear;
  animation-fill-mode: both;
  animation-timeline: --bg-scroll;
}
#bg::before {
  animation-name: bg-before;
}
#bg::after {
  animation-name: bg-after;
}
@keyframes bg-before {
  from {
    transform: translate(-50%, -50%) rotate(43deg);
    transform-origin: calc(50% - 1em) calc(50% + 0.6em);
  }
  to {
    transform: translate(-50%, -50%) rotate(47deg);
    transform-origin: calc(50% + 1em) calc(50% - 0.6em);
  }
}
@keyframes bg-after {
  from {
    transform: translate(-50%, -50%) rotate(47deg);
    transform-origin: calc(50% + 0.6em) calc(50% + 1em);
  }
  to {
    transform: translate(-50%, -50%) rotate(43deg);
    transform-origin: calc(50% - 0.6em) calc(50% - 1em);
  }
}
`;
function element4() {
  return fragment2(toList([
    element2("style", List$Empty$const, toList([text3(css)])),
    div(toList([id("bg")]), List$Empty$const)
  ]));
}

// build/dev/javascript/index/index_ffi.mjs
function resolve(path) {
  return new URL(path, document.baseURI);
}
function fetchText(url) {
  return fetch(url, { cache: "no-store" }).then((response) => response.text());
}
function fetchMarkdown(path, callback) {
  fetchText(resolve(path)).then(callback);
}
function injectStylesheet(path) {
  if (!path)
    return;
  const url = resolve(path).href;
  let style2 = [...document.head.querySelectorAll("style[data-stylesheet]")].find((element5) => element5.dataset.stylesheet === url);
  if (!style2) {
    style2 = document.createElement("style");
    style2.dataset.stylesheet = url;
    document.head.append(style2);
  }
  fetchText(url).then((css2) => {
    style2.textContent = css2;
  });
}

// build/dev/javascript/index/components/global_style.mjs
var FILEPATH6 = "src\\components\\global_style.gleam";

class HrefChanged extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
function log_ease(t, k) {
  let $ = logarithm(1 + k * t);
  let numerator;
  if ($ instanceof Ok) {
    numerator = $[0];
  } else {
    throw makeError("let_assert", FILEPATH6, "components/global_style", 75, "log_ease", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 1708,
      end: 1765,
      pattern_start: 1719,
      pattern_end: 1732
    });
  }
  let $1 = logarithm(1 + k);
  let denominator;
  if ($1 instanceof Ok) {
    denominator = $1[0];
  } else {
    throw makeError("let_assert", FILEPATH6, "components/global_style", 76, "log_ease", "Pattern match failed, no pattern matched the value.", {
      value: $1,
      start: 1768,
      end: 1822,
      pattern_start: 1779,
      pattern_end: 1794
    });
  }
  return divideFloat(numerator, denominator);
}
function chroma(level) {
  let d = identity(absolute_value(level - 6)) / 10;
  return 0.28 * (1 - log_ease(d, 3));
}
function pad3(n) {
  let $ = n < 10;
  if ($) {
    return "00" + to_string(n);
  } else {
    let $1 = n < 100;
    if ($1) {
      return "0" + to_string(n);
    } else {
      return to_string(n);
    }
  }
}
function trim_zeros(loop$digits) {
  while (true) {
    let digits2 = loop$digits;
    let $ = ends_with(digits2, "0");
    if ($) {
      loop$digits = drop_end(digits2, 1);
    } else {
      return digits2;
    }
  }
}
function format_round3(x) {
  let scaled = round2(x * 1000);
  let whole = globalThis.Math.trunc(scaled / 1000);
  let frac = scaled % 1000;
  if (frac === 0) {
    return to_string(whole);
  } else {
    return to_string(whole) + "." + trim_zeros(pad3(frac));
  }
}
function lightness(level) {
  let t = identity(level - 1) / 9;
  let u = 1 - log_ease(1 - t, 9);
  return 0.97 - u * 0.77;
}
function primary_rule(level) {
  let n = to_string(level);
  return "--primary-" + n + ": " + format_round3(lightness(level)) + " " + format_round3(chroma(level)) + " var(--primary-hue, 360);";
}
function range(from3, to) {
  let $ = from3 > to;
  if ($) {
    return List$Empty$const;
  } else {
    return prepend(from3, range(from3 + 1, to));
  }
}
function primary_style() {
  let _block;
  let _pipe = range(1, 10);
  let _pipe$1 = map2(_pipe, primary_rule);
  _block = join(_pipe$1, `
`);
  let rules = _block;
  return '@import "https://ga.jspm.io/npm:@nanarino/stylus@2.0.0/dist/style.min.css";' + ":root {" + rules + "}" + ":root {color: var(--color, oklch(0.4 0.15 var(--primary-hue, 360)));}";
}
function element5(href2) {
  return fragment2(toList([
    element2("style", List$Empty$const, toList([text3(primary_style())])),
    element2("global-style", toList([href(href2)]), List$Empty$const)
  ]));
}
function view(_) {
  return none2();
}
function inject(href2) {
  return from2((_) => {
    return injectStylesheet(href2);
  });
}
function update2(_, msg) {
  let href2 = msg[0];
  return [undefined, inject(href2)];
}
function init(_) {
  return [undefined, none()];
}
function app() {
  return component(init, update2, view, toList([
    on_attribute_change("href", (href2) => {
      return new Ok(new HrefChanged(href2));
    })
  ]));
}
function register() {
  let $ = make_component(app(), "global-style");
  return;
}

// build/dev/javascript/index/components/markdown/a.mjs
function view2(_, href2, _1, children) {
  let _block;
  let $1 = starts_with(href2, "/");
  if ($1) {
    _block = [drop_start(href2, 1), "_self"];
  } else {
    _block = [href2, "_blank"];
  }
  let $ = _block;
  let href$1 = $[0];
  let target2 = $[1];
  return a(toList([
    class$("na-link"),
    href(href$1),
    target(target2),
    styles(toList([["--background-color-code", "0 0 0 / 0"]]))
  ]), children);
}

// build/dev/javascript/index/components/markdown/blockquote.mjs
function view3(_, children) {
  return blockquote(toList([class$("na-blockquote")]), children);
}

// build/dev/javascript/index/components/markdown/code.mjs
function view4(_, language, children) {
  let _block;
  if (language instanceof Some) {
    let language$1 = language[0];
    _block = toList([
      class$("na-code"),
      attribute2("data-language", language$1)
    ]);
  } else {
    _block = toList([class$("na-code")]);
  }
  let attributes = _block;
  return code(attributes, children);
}

// build/dev/javascript/index/components/markdown/h1.mjs
function view5(_, _1, children) {
  return h1(toList([class$("na-title na-font-serif")]), children);
}

// build/dev/javascript/index/components/markdown/icon.mjs
function clover(rotation, view_box, fill, stroke, paths) {
  return unsafe_raw_html("http://www.w3.org/2000/svg", "svg", toList([
    attribute2("viewBox", view_box),
    attribute2("fill", fill),
    attribute2("stroke", stroke),
    attribute2("stroke-width", "30"),
    attribute2("stroke-linecap", "round"),
    attribute2("stroke-linejoin", "round"),
    styles(toList([
      ["width", "1em"],
      ["height", "1em"],
      ["transform", "rotate(" + rotation + ") rotateY(180deg)"]
    ]))
  ]), paths);
}
function outline_clover(rotation) {
  return clover(rotation, "0 0 682.66669 682.66669", "none", "currentColor", `<g transform='matrix(1.3333333,0,0,-1.3333333,0,682.66667)'>
<g transform='translate(248.5693,263.4307)'><path d='m 0,0 c 0,0 26.703,-26.703 56.442,-56.442 50.915,-50.915 119.978,-79.522 191.989,-79.522'/></g>
<g transform='translate(248.5693,263.4307)'><path d='m 0,0 v 155.71 c 0,42.971 -34.889,77.859 -77.859,77.859 -42.971,0 -77.851,-34.888 -77.851,-77.859 -42.971,0 -77.859,-34.88 -77.859,-77.851 0,-42.97 34.888,-77.859 77.859,-77.859 z'/></g>
<g transform='translate(248.5693,263.4307)'><path d='m 0,0 -150.408,-40.303 c -41.509,-11.118 -66.171,-53.848 -55.052,-95.356 11.125,-41.508 53.847,-66.171 95.355,-55.052 11.118,-41.508 53.848,-66.171 95.356,-55.053 41.508,11.126 66.17,53.848 55.052,95.356 z'/></g>
<g transform='translate(248.5693,263.4307)'><path d='m 0,0 150.408,-40.303 c 41.509,-11.118 84.23,13.544 95.356,55.052 11.118,41.509 -13.545,84.238 -55.053,95.356 11.118,41.508 -13.544,84.229 -55.052,95.355 C 94.15,216.579 51.421,191.917 40.303,150.408 Z'/></g>
<g transform='translate(155.1416,356.8584)'><path d='M 0,0 93.428,-93.428'/></g>
<g transform='translate(182.5029,149.0039)'><path d='M 0,0 66.066,114.427'/></g>
<g transform='translate(362.9956,329.4966)'><path d='M 0,0 -114.426,-66.066'/></g>
</g>`);
}
function icon_size() {
  return styles(toList([["width", "24px"], ["height", "24px"]]));
}
function eye(src3) {
  return unsafe_raw_html("http://www.w3.org/2000/svg", "svg", toList([
    attribute2("viewBox", "0 0 48 48"),
    attribute2("fill", "none"),
    attribute2("stroke", "currentColor"),
    attribute2("stroke-width", "4"),
    attribute2("role", "button"),
    attribute2("aria-label", "Open the image in a new tab"),
    attribute2("data-icon", "interactive-button/outline/eye"),
    attribute2("onclick", "window.open('" + src3 + "')"),
    icon_size()
  ]), "<path fill-rule='evenodd' clip-rule='evenodd' d='M24 37C30.6274 37 36.6274 32.6667 42 24C36.6274 15.3333 30.6274 11 24 11C17.3726 11 11.3726 15.3333 6 24C11.3726 32.6667 17.3726 37 24 37Z' stroke-linecap='butt'></path><path d='M29 24C29 26.7614 26.7614 29 24 29C21.2386 29 19 26.7614 19 24C19 21.2386 21.2386 19 24 19C26.7614 19 29 21.2386 29 24Z' stroke-linecap='butt'></path>");
}
function eye_invisible() {
  return unsafe_raw_html("http://www.w3.org/2000/svg", "svg", toList([
    attribute2("viewBox", "0 0 48 48"),
    attribute2("fill", "none"),
    attribute2("stroke", "currentColor"),
    attribute2("stroke-width", "4"),
    attribute2("role", "note"),
    attribute2("aria-label", "The image failed to load"),
    attribute2("aria-disabled", "true"),
    attribute2("data-icon", "interactive-button/outline/eye-invisible"),
    icon_size()
  ]), "<path d='M14 14.5C11.3096 16.5 8.58489 19.8302 6 24C11.3726 32.6667 17.3726 37 24 37C27.3245 37 30.4912 35.9096 33.5 33.7287M17.4635 12.5C19 11 21.7488 11 24 11C30.6274 11 36.6274 15.3333 42 24C40.2344 26.8481 38.4011 29.2282 36.5 31.1404' stroke-linecap='butt'></path><path d='M29 24C29 26.7614 26.7614 29 24 29C21.2386 29 19 26.7614 19 24C19 21.2386 21.2386 19 24 19C26.7614 19 29 21.2386 29 24Z' stroke-linecap='butt'></path><path d='M6.85156 7.10254L41.1462 41.3972' stroke-linecap='butt'></path>");
}

// build/dev/javascript/index/components/heading.mjs
function with_anchor(tag, marks, rotation, id2, children) {
  return element2(tag, toList([class$("na-title na-font-serif"), id(id2)]), prepend(a(toList([
    class$("na-link na-cannot-select"),
    href("#" + id2),
    styles(toList([["margin-right", "0.2em"]]))
  ]), toList([
    outline_clover(rotation),
    span(toList([styles(toList([["font-size", "0"]]))]), toList([text3(marks)]))
  ])), children));
}

// build/dev/javascript/index/components/markdown/h2.mjs
function view6(_, id2, children) {
  return with_anchor("h2", "##", "-37deg", id2, children);
}

// build/dev/javascript/index/components/markdown/h3.mjs
function view7(_, id2, children) {
  return with_anchor("h3", "###", "-33deg", id2, children);
}

// build/dev/javascript/index/components/markdown/h4.mjs
function view8(_, id2, children) {
  return with_anchor("h4", "####", "-27deg", id2, children);
}

// build/dev/javascript/index/components/markdown/h5.mjs
function view9(_, id2, children) {
  return with_anchor("h5", "#####", "-23deg", id2, children);
}

// build/dev/javascript/index/components/markdown/h6.mjs
function view10(_, id2, children) {
  return with_anchor("h6", "######", "-17deg", id2, children);
}

// build/dev/javascript/index/components/markdown/hr.mjs
function view11() {
  return hr(toList([class$("na-divider")]));
}

// build/dev/javascript/index/components/markdown/img.mjs
function view12(_, src3, alt2, title2) {
  let _block;
  if (title2 instanceof Some) {
    let title$12 = title2[0];
    _block = toList([title(title$12)]);
  } else {
    _block = List$Empty$const;
  }
  let title$1 = _block;
  return span(toList([class$("na-image")]), toList([
    img(prepend(src(src3), prepend(alt(alt2), prepend(attribute2("ondragstart", "return false"), prepend(attribute2("onerror", "this.parentElement.dataset.error='';this.onerror=null"), title$1))))),
    span(toList([class$("na-image-mask")]), toList([eye(src3), eye_invisible()]))
  ]));
}

// build/dev/javascript/index/components/markdown/li.mjs
function view13(children) {
  return li(toList([class$("na-list")]), children);
}

// build/dev/javascript/index/components/markdown/p.mjs
function view14(_, children) {
  return p(toList([class$("na-paragraph na-font-serif")]), children);
}

// build/dev/javascript/index/components/markdown/pre.mjs
function view15(attributes, children) {
  let _block;
  let $ = get(attributes, "data-language");
  if ($ instanceof Ok) {
    let language2 = $[0];
    _block = toList([attribute2("data-language", language2)]);
  } else {
    _block = List$Empty$const;
  }
  let language = _block;
  return section(toList([
    class$("na-watermark"),
    styles(toList([["--border-radius-watermark", "var(--border-radius-md)"]]))
  ]), toList([
    pre(prepend(class$("na-pre"), language), children)
  ]));
}

// build/dev/javascript/index/components/markdown/table.mjs
function view16(children) {
  return div(toList([class$("na-table-wrapper")]), toList([
    table(toList([
      class$("na-table md"),
      styles(toList([["--text-align-cell", "center"]]))
    ]), children)
  ]));
}

// build/dev/javascript/index/components/markdown/td.mjs
function view17(_, children) {
  return td(toList([class$("na-table-cell")]), children);
}

// build/dev/javascript/index/components/markdown/th.mjs
function view18(_, children) {
  return th(toList([class$("na-table-cell na-font-serif")]), children);
}

// build/dev/javascript/index/components/markdown/tr.mjs
function view19(children) {
  return tr(toList([class$("na-table-row")]), children);
}

// build/dev/javascript/index/components/markdown.mjs
function components() {
  let _pipe = default$();
  let _pipe$1 = a2(_pipe, view2);
  let _pipe$2 = h12(_pipe$1, view5);
  let _pipe$3 = h22(_pipe$2, view6);
  let _pipe$4 = h32(_pipe$3, view7);
  let _pipe$5 = h42(_pipe$4, view8);
  let _pipe$6 = h52(_pipe$5, view9);
  let _pipe$7 = h62(_pipe$6, view10);
  let _pipe$8 = hr2(_pipe$7, view11);
  let _pipe$9 = p2(_pipe$8, view14);
  let _pipe$10 = blockquote2(_pipe$9, view3);
  let _pipe$11 = code2(_pipe$10, view4);
  let _pipe$12 = pre2(_pipe$11, view15);
  let _pipe$13 = table2(_pipe$12, view16);
  let _pipe$14 = tr2(_pipe$13, view19);
  let _pipe$15 = td2(_pipe$14, view17);
  let _pipe$16 = th2(_pipe$15, view18);
  let _pipe$17 = img2(_pipe$16, view12);
  return li2(_pipe$17, view13);
}

// build/dev/javascript/index/index.mjs
var FILEPATH7 = "src\\index.gleam";

class Loading extends CustomType {
}
var Model$Loading$const = new Loading;

class Ready extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}

class MarkdownLoaded extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
var stylesheet = "index.css";
function view20(model) {
  let _block;
  if (model instanceof Loading) {
    _block = List$Empty$const;
  } else {
    let markdown = model[0];
    _block = render_markdown(markdown, (() => {
      let _pipe = configure2();
      return heading_ids(_pipe, true);
    })(), components());
  }
  let content = _block;
  return fragment2(toList([
    element5(stylesheet),
    element4(),
    div(List$Empty$const, content)
  ]));
}
function update3(model, msg) {
  let markdown = msg[0];
  return [new Ready(markdown), none()];
}
function load_markdown() {
  return from2((dispatch2) => {
    return fetchMarkdown("index.md", (markdown) => {
      return dispatch2(new MarkdownLoaded(markdown));
    });
  });
}
function init2(_) {
  return [Model$Loading$const, load_markdown()];
}
function main() {
  register();
  let app2 = application(init2, update3, view20);
  let $ = start4(app2, "#app", undefined);
  if (!($ instanceof Ok)) {
    throw makeError("let_assert", FILEPATH7, "index", 16, "main", "Pattern match failed, no pattern matched the value.", { value: $, start: 351, end: 400, pattern_start: 362, pattern_end: 367 });
  }
  return;
}

// .lustre/build/index.mjs
main();
