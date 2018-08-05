class ArrayPool {
  constructor(size) {
    this._arr = new Array(size);
    this._curr = 0;
    this._length = size;
  }
  push(val) {
    this._arr[this._curr] = val;
    this._curr++;
    if (this._curr >= this._length) {
      this._length += 100;
      this._arr.length = this._length;
    }
  }
  map(fn) {
    let out = [];
    for (let i=0; i<this._curr; i++) {
      out.push(fn(this._arr[i], i, this));
    }
    return out;
  }
  get length() {
    return this._curr;
  }
  get(index) {
    return this._arr[index];
  }
  reset() {
    this._curr = 0;
    for (let i=0; i<this._length; i++) {
      this._arr[i] = undefined;
    }
  }
  sort(func) {
    this._arr.sort(func);
  }
}

export {ArrayPool};