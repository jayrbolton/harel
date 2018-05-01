# Harel Statecharts

> Harel Statecharts in javascript for declarative UI

[View an introduction to statecharts](https://statecharts.github.io/)

This is a Statechart library with an emphasis on simplicity and minimalism. This is in contrast to something like [xstate](https://github.com/davidkpiano/xstate), which focuses on robustness and completeness. The goal for this library is to start simple and make it easy to build layers on top, such as event emitters, actions, DOM renderers, etc.

## Usage

```js
const Chart = require('harel')

// A basic countdown timer with a Start/Pause button and a Reset button

const timer = Chart({
  START: [
    ['paused', 'running'],
    ['reset', 'running']
  ],
  PAUSE: ['running', 'paused'],
  RESET: [
    ['running', 'reset'],
    ['finished', 'reset'],
    ['paused', 'reset']
  ],
  DONE: ['running', 'finished']
})

const s1 = 'reset'
const s2 = timer(s1, 'START') // -> 'running'
const s3 = timer(s2, 'PAUSE') // -> 'paused'
const s4 = timer(s3, 'RESET') // -> 'reset'
const s5 = timer(s4, 'START') // -> 'running'
const s6 = timer(s5, 'DONE') // -> 'finished'
```

## API

```js
var Chart = require('harel')
```

### Chart(events)

Create a new chart as a set of events. `events` is an object where each key is an event name and each value is an array of pairs of state transitions (or a single pair).

```js
Chart({
  EVENT_NAME1: [transitionFrom, transitionTo],
  EVENT_NAME2: [
    [transitionFrom, transitionTo],
    [transitionFrom, transitionTo]
  ]
})
```

Capitalizing event names is just a convention and not required.

The states themselves can be any value, such as strings, objects, typescript enums, etc.

All state values are compared using `===` except for objects and arrays, which are JSON.stringified before being compared.

Returns a function with the signature:

### chart(state, event)

`chart` is a function returned by `Chart` above. It returns a new state based on a starting state and event name.

`state` can be any value in your transition pairs. If that state is not found or inactive, an error is immediately raised.

`event` can be any event name key in your chart. If they event is not found or is not accessible from the given state, an error is immediately raised.

### Howtos

TODO 

* Parallel states
* Nested states
* Event emitter
* Guards
* FRP

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install harel
```

## Acknowledgments

Thanks to [davidkpiano](https://github.com/davidkpiano) for giving [a talk](https://www.youtube.com/watch?v=VU1NKX6Qkxc) about state charts.

## See Also

- [Original paper about statecharts](http://www.inf.ed.ac.uk/teaching/courses/seoc/2005_2006/resources/statecharts.pdf)
- [xstate](https://github.com/davidkpiano/xstate/) -- a good alternate implementation
- Book: [Constructing the User Interface with Statecharts by Ian Horrocks](https://www.amazon.com/Constructing-User-Interface-Statecharts-Horrocks/dp/0201342782)

## License

MIT

