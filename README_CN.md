# pool.js

[![npm version](https://img.shields.io/npm/v/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![npm version](https://img.shields.io/npm/l/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![npm downloads](https://img.shields.io/npm/dt/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![coverage](https://img.shields.io/codecov/c/github/harvey-woo/pool.js.svg?style=flat-square)](https://codecov.io/gh/harvey-woo/pool.js)
[![Build Status](https://img.shields.io/travis/harvey-woo/pool.js.svg?style=flat-square)](https://travis-ci.org/harvey-woo/pool.js)


这个一个基于资源池模式、Javascript, Typescript友好的抽象资源池工具库。
能够帮助你快速构建一个资源池，以及对资源池进行管理。


- [中文](./README_CN.md)
- [English](./README.md)


## 特性

支持以下特性：
- [x] 资源池的创建
- [x] 资源获取、释放
- [ ] 资源池的扩容、缩容
- [x] 资源池的事件监听
- [x] 资源的事件监听
- [x] 资源异步调度


## 安装

```bash
npm install @cat5th/pool.js
```
or yarn

```bash
yarn add @cat5th/pool.js
```

## 尝试


创建一个资源池

```javascript
import { Pool } from '@cat5th/pool.js';
const pool = new Pool(3);
```

创建一个Web Worker资源池

```javascript
import { Pool } from '@cat5th/pool.js';

const workerPool = new Pool((created) => {
  if (created > 3) {
    return undefined;
  }
  const worker = new Worker('worker.js');
  return worker;
});

const limitter = workerPool.limit();
limitter(function() {
  // this === worker
  this.postMessage('hello');
});
```

限制请求频率为每秒最多10次

```javascript
import { pLimit } from '@cat5th/pool.js';
const limitter = pLimit(10, {
  minDuration: 1000,
});

function request() {
  return limitter(async function() {
    const response = await fetch('https://api.github.com');
    return response.json();
  });
});

for (let i = 0; i < 100; i++) {
  request();
}
```


## 文档

### 创建资源池

```javascript
import { Pool } from '@cat5th/pool.js';

const create = (created) => {
  // 创建资源
  return {
    // created 为已创建的资源数量
    id: created,
  };
};

const pool = new Pool(create);

// 或者 以对象的形式创建资源池
const pool = new Pool({
  create,
  // 初始化资源池大小
  initialSize: 10,
  // 资源重置函数
  reset: (resource) => {
    console.log('资源被释放了');
  },
});


// 或者 传入 number
const pool = new Pool(10);
// 等效于
const pool = new Pool((created) => {
  return created > 10 ? undefined : Object.create(null);
});

```

### 获取资源

```javascript
// 同步获取资源
const resource = pool.acquire();
// resource?.id === 0
// 当资源池中没有资源时，会返回 `undefined``

// 异步获取资源
const resource = await pool.acquire(true);
// resource.id === 0
// 当资源池中没有资源时，会等待资源池中有资源时才返回

```

### 释放资源

```javascript
// 释放方法是同步的
pool.release(resource);
```

### 监听资源池事件

```javascript
// 监听资源池的获取事件
pool.on('create', (resource) => {
  console.log(`资源 ${resource.id} 被获取了`);
});

// 监听资源池的释放事件
pool.on('release', (resource) => {
  console.log(`资源 ${resource.id} 被释放了`);
});

```

### 资源调度限制器

```javascript
const limitter = pool.limit();

// 资源限制器是一个执行函数，需要传入一个异步的消费函数，以及它的参数
// 限制器会返回一个 `Promise`，当资源池中有资源时，会执行消费函数
// 当资源池中没有资源时，会等待资源池中有资源时才执行消费函数
const result = await limitter(async function(...args) {
  console.log(`当前资源为 ${this.id}`);
  // resource.id === 0
  // args === [1, 2, 3]
  return 1;
}, 1, 2, 3);

// limit 方法支持传入限制器参数
const limitter = pool.limit({
  // 消费函数最少执行时间，如果消费函数执行时间小于 `minDuration`，
  // 执行会随着消费函数同时结束，但使用的资源会在 `minDuration`` 后释放
  minDuration: 1000,
});

```

### pLimit / Pool.limit

是的，`cat5th/pool.js` 很贴心的提供了一个 `pLimit` 和 `Pool.limit` 的方法，它是`Pool.prototype.limit`的别名。

```javascript
import { pLimit } from '@cat5th/pool.js';

// `pLimit`的第一参数为`Pool`构造器的参数，第二个参数为`Pool.prototype.limit`的参数
const limitter = pLimit(10, {
  minDuration: 1000,
});

```

## 感谢
感谢以下项目的启发：
- [pLimit](https://github.com/sindresorhus/p-limit)

