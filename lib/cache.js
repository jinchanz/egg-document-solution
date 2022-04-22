const DEFAULT_CAPACITY = 100;
const DEFAULT_EXPIRE = 60000;

/**
 * LRU Cache Based on Map
 */
class LRU {
  constructor(capacity) {
    this.cache = new Map();
    this.capacity = capacity;
  }

  /**
   * @param {number} key
   * @return {number}
   */
  get(key) {
    let cache = this.cache;
    if (cache.has(key)) {
      let temp = cache.get(key)
      cache.delete(key);
      cache.set(key, temp);
      return temp;
    }
  };

  /**
   * @param {number} key
   * @param {number} value
   * @return {void}
   */
  set(key, value) {
    let cache = this.cache;
    if (cache.has(key)) {
      cache.delete(key);
    } else if (cache.size >= this.capacity) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(key, value);
  };

  setex(key, value, expire = DEFAULT_EXPIRE) {
    let cache = this.cache;
    if (cache.has(key)) {
      cache.delete(key);
    } else if (cache.size >= this.capacity) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(key, value);
    setTimeout(() => {
      cache.delete(key);
    }, expire);
  }

  listAll() {
    const map = {};
    this.cache.forEach(function(value, key) {
      map[key] = value;
    })
    return JSON.stringify(map, null, 2);
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    if (!key) return;
    this.cache.delete(key);
  }

  filterKeys(keyword) {
    if (!keyword) return;
    let resultKeys = [];
    const keys = this.cache.keys();
    let iterator = keys.next();
    while(!iterator.done) {
      if (iterator.value && iterator.value.includes(keyword)) {
        resultKeys.push(iterator.value);
      }
      iterator = keys.next();
    }
    if (iterator.value && iterator.value.includes(keyword)) {
      resultKeys.push(iterator.value);
    }
    return resultKeys;
  }

}

const singleton = new LRU(DEFAULT_CAPACITY);

module.exports = singleton;
