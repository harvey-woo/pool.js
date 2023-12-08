# pool.js

[![npm version](https://img.shields.io/npm/v/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![npm version](https://img.shields.io/npm/l/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![npm downloads](https://img.shields.io/npm/dt/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![coverage](https://img.shields.io/codecov/c/github/harvey-woo/pool.js.svg?style=flat-square)](https://codecov.io/gh/harvey-woo/pool.js)
[![Build Status](https://github.com/harvey-woo/pool.js/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/harvey-woo/pool.js/actions/workflows/npm-publish.yml)


This is an abstract resource pool utility library based on the resource pool pattern, JavaScript, and TypeScript friendly.
It helps you quickly build a resource pool and manage it.


- [中文](./README_CN.md)
- [English](./README.md)


## Features

Supports the following features:
- [x] Creating a resource pool
- [x] Acquiring and releasing resources
- [ ] Scaling up and down the resource pool
- [x] Listening to resource pool events
- [x] Listening to resource events
- [x] Asynchronous scheduling of resources


## Try it out

Build a resource pool

```javascript
import { Pool } from '@cat5th/pool.js';
const pool = new Pool(3);
```

Build a Web Worker resource pool

```javascript
import { Pool } from '@cat5th/pool.js';

const workerPool = new Pool((created) => {
  if (created > 3) {
    return undefined;
  }
  const worker = new Worker('worker.js');
  return worker;
});

const limiter = workerPool.limit();
limiter(function() {
  // this === worker
  this.postMessage('hello');
});
```

Limit the request rate to a maximum of 10 times per second.
```javascript
import { limit } from '@cat5th/pool.js';

const request = limit(function() {
  const response = await fetch('https://api.github.com');
  return response.json();
}, 10, {
  minDuration: 1000,
});

for (let i = 0; i < 100; i++) {
  request();
}
```

## Documentation

### Create a resource pool

```javascript
import { Pool } from '@cat5th/pool.js';

const create = (created) => {
  // create resource
  return {
    // `created` is the number of resources created
    id: created,
  };
};

const pool = new Pool(create);

// Or pass in an object
const pool = new Pool({
  create,
  // The initial number of resources to create
  initialSize: 10,
  // Resource reset function
  reset: (resource) => {
    console.log('The resource has been released');
  },
});


// Or pass in a number
const pool = new Pool(10);
// equivalent to
const pool = new Pool((created) => {
  return created > 10 ? undefined : Object.create(null);
});

```

### Acquire pool resources

```javascript
// Synconous acquire
const resource = pool.acquire();
// resource?.id === 0
// When the resource pool is empty, `acquire` returns `undefined`

// Asynchronous acquire
const resource = await pool.acquire(true);
// resource.id === 0
// When the resource pool is empty, will wait for the resource to be released
```

### Release pool resources

```javascript
// Release is asynchronous
pool.release(resource);
```

### Listen to resource pool events

```javascript
// Listen to the `acquire` event
pool.on('acquire', (resource) => {
  console.log(`Resource ${resource.id} has been acquired`);
});

// Listen to the `release` event
pool.on('release', (resource) => {
  console.log(`Resource ${resource.id} has been released`);
});

```

### Resource limiter

```javascript
const limiter = pool.limit();

// Resource limiter is an execution function that needs to pass in an asynchronous consumption function and its parameters
// The limiter returns a `Promise`, which will execute the consumption function when there are resources in the resource pool
// When there are no resources in the resource pool, the consumption function will be executed when there are resources in the resource pool
const result = await limiter(async function(...args) {
  console.log(`Current resource is ${this.id}`)
  // resource.id === 0
  // args === [1, 2, 3]
  return 1;
}, 1, 2, 3);

// limiter method supports passing in limiter options
const limiter = pool.limit({
  // The minimum execution time of the consumption function, if the execution time of the consumption function is less than `minDuration`,
  // The execution will end at the same time as the consumption function, but the used resources will be released after `minDuration`
  minDuration: 1000,
});

```

### pLimit / Pool.limit / limit

Yes, `cat5th/pool.js` provides a convenient method called `pLimit` and `Pool.limit`, which is an alias for `Pool.prototype.limit`.

```javascript
import { pLimit } from '@cat5th/pool.js';

// The first argument of `pLimit` is the parameter for the `Pool` constructor, and the second argument is the parameter for `Pool.prototype.limit`
const limiter = pLimit(10, {
  minDuration: 1000,
});

```

`limit` is a wrapper method for `Pool.limit`, which is directly return a function that can be executed.

```javascript
import { limit } from '@cat5th/pool.js';
const fn = limit(async function() {
  // ...
}, 10, {
  minDuration: 1000,
});
fn(...args);
```

## Thanks
Inspired by the following projects:
- [pLimit](https://github.com/sindresorhus/p-limit)
