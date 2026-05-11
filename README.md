# 🏊 pool.js

[![npm version](https://img.shields.io/npm/v/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![npm version](https://img.shields.io/npm/l/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![npm downloads](https://img.shields.io/npm/dt/@cat5th/pool.js.svg?style=flat-square)](https://www.npmjs.com/package/@cat5th/pool.js)
[![coverage](https://img.shields.io/codecov/c/github/harvey-woo/pool.js.svg?style=flat-square)](https://codecov.io/gh/harvey-woo/pool.js)
[![Build Status](https://github.com/harvey-woo/pool.js/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/harvey-woo/pool.js/actions/workflows/npm-publish.yml)

![example](./example.webp)

A lightweight resource pool scheduler for JavaScript and TypeScript.
Based on ES2024 Explicit Resource Management (`Symbol.dispose` / `Symbol.asyncDispose`).

- [中文文档](#中文)
- [English README](#english)
- [Live Demo](https://pooljs.cat5th.com/playground)
- [API Docs](https://pooljs.cat5th.com/docs)
- [Blog: Implement Request Concurrency Control with Elegance](https://juejin.cn/post/7310009007921791003)


## Features

- [x] 🎯 Explicit resource management via `Symbol.dispose`
- [x] 📋 Task scheduler (`Scheduler`) for automatic resource allocation
- [x] ⏱️ CoolDown callbacks for rate limiting
- [x] 🔧 Flexible configuration: factory functions, pre-created resources, custom concurrency
- [x] ⏳ Async cleanup via `Symbol.asyncDispose`
- [x] 📦 Zero dependencies

## Installation

```bash
npm install @cat5th/pool.js
```

or yarn

```bash
yarn add @cat5th/pool.js
```

## Quick Start

Create a resource pool with a concurrency limit:

```javascript
import { Pool } from '@cat5th/pool.js';

const pool = new Pool({
  concurrency: 3,
  create: (i) => ({ id: i })
});

// acquire() returns a ResourceContainer
// The resource is automatically released when leaving scope (Symbol.dispose)
using resource = await pool.acquire();
console.log(resource.value.id);

// Clean up the entire pool (waits for all borrowed resources to return)
await pool[Symbol.asyncDispose]();
```

Use the Scheduler for task-based execution:

```javascript
const pool = new Pool({
  concurrency: 2,
  create: (i) => `worker-${i}`
});

const scheduler = pool.schedule();

function work(this: string, data: string) {
  console.log(`${this} processing: ${data}`);
  return data.toUpperCase();
}

// Automatically dispatch to available resources
const result = await scheduler.enqueue(work, 'hello');

// Or wrap a function for easy reuse
const wrapped = scheduler.wrap(work);
await wrapped('world');
```

## Documentation

### Pool

Create a resource pool:

```javascript
import { Pool } from '@cat5th/pool.js';

// Via config object
const pool = new Pool({
  concurrency: 5,
  create: (i) => createDatabaseConnection(i),
  coolDown({ deliverAt, releaseAt }) {
    // Rate limit: ensure minimum 1s between uses
    return new Promise(resolve =>
      setTimeout(resolve, Math.max(0, 1000 - (releaseAt - deliverAt)))
    );
  }
});

// Via concurrency number (resources are auto-generated indices)
const pool2 = new Pool(3);
// Equivalent to: new Pool({ concurrency: 3, create: (i) => i })

// Via existing resource array
const pool3 = new Pool([worker1, worker2, worker3]);
```

### PoolOptions

| Property | Type | Default | Description |
|---|---|---|---|
| `concurrency` | `number` | — | Maximum number of resources the pool can manage |
| `create` | `(created: number) => T \| PromiseLike<T>` | `(i) => i` | Factory function to create a new resource |
| `resources` | `T[]` | — | Pre-existing resources; these are **not** disposed on cleanup |
| `coolDown` | `CoolDown` | — | Callback to control re-scheduling timing after release |
| `shouldDispose` | `boolean` | `true` | Whether to dispose pool-created resources on cleanup |

### acquire()

Acquire a resource from the pool. Returns a `ResourceContainer<T>`.

```javascript
// Default: wait if no resource is available
const resource = await pool.acquire();

// wait: false — throw immediately if no resource
try {
  using resource = await pool.acquire({ wait: false });
  // ...
} catch (error) {
  if (isNoResourceAvailableError(error)) {
    console.log('No resource available');
  }
}

// AbortSignal — cancel a wait
const controller = new AbortController();
using resource = await pool.acquire({ abortSignal: controller.signal });
// ...
controller.abort(); // throws AbortError
```

### schedule()

Create a `Scheduler` for task-based resource execution:

```javascript
const scheduler = pool.schedule();

await scheduler.enqueue(
  function(this: Connection, query) {
    return this.query(query);
  },
  'SELECT * FROM users'
);
```

### Scheduler

The `Scheduler` provides a task-based approach — you don't manually acquire or release resources.

```javascript
const scheduler = pool.schedule();

// enqueue — execute a single task
const result = await scheduler.enqueue(workFn, arg1, arg2);

// enqueueAll — batch execute from an iterable
const results = await scheduler.enqueueAll(tasks, ...args);

// wrap — return a function that auto-enqueues
const query = scheduler.wrap(function(this: Connection, sql) {
  return this.query(sql);
});
const rows = await query('SELECT * FROM users');
```

### CoolDown

A callback that receives timing information and returns a Promise controlling when the resource becomes available again:

```javascript
const pool = new Pool({
  concurrency: 5,
  create: (i) => createHttpClient(i),
  coolDown: async ({ acquireAt, deliverAt, releaseAt }) => {
    // Wait 100ms after release before re-use
    await new Promise(resolve => setTimeout(resolve, 100));
  }
});
```

### Symbol.asyncDispose

Clean up the pool — waits for all borrowed resources to return, then disposes pool-created resources:

```javascript
await pool[Symbol.asyncDispose]();
```

## Thanks

Inspired by [pLimit](https://github.com/sindresorhus/p-limit).
