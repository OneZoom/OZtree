class ObjectPool {
  constructor(ClassType, size) {
    this.ClassType = ClassType;
    this.size = size;
  }
  init() {
    this.arr = new Array(this.size);
    this.available_obj = new Array(this.size);
    //console.time("ObjectPool " + this.ClassType.name + " create " + this.size);
    for (let i=0; i<this.size; i++) {
      this.create_new_obj(i, i);
    }
    //console.timeEnd("ObjectPool " + this.ClassType.name + " create " + this.size);
  }
  get() {
    if (this.available_obj === undefined) {
        // We haven't been init'ed yet, so do it now
        this.init();
    }
    if (this.available_obj.length == 0) {
      let prev_size = this.size;
      this.size += Math.round(Math.max(this.size/10, 10));
      //console.log(this.ClassType.name + " " + this.size);
      this.arr.length = this.size;
      for (let i = prev_size; i<this.size; i++) {
        this.create_new_obj(i, i-prev_size);
      }
    }
    return this.arr[this.available_obj.pop()];
  }
  create_new_obj(index_in_arr, available_index) {
    this.arr[index_in_arr] = new this.ClassType();
    this.arr[index_in_arr]._pool_id = index_in_arr;
    // this.arr[index_in_arr]._pool = this;
    this.available_obj[available_index] = index_in_arr;
  }
  release(obj) {
    if (obj._pool_id === undefined) return;
    this.available_obj.push(obj._pool_id);
    if (obj.release) {
      obj.release();
    }
  }
}

export {ObjectPool};