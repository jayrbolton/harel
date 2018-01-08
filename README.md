# harel statecharts

> Harel Statecharts in javascript for declarative UI

Harel statecharts are a declarative way to describe ui behavior. They're fun to make and easy to maintain.

## Usage

```js
var Harel = require('harel')

// A basic countdown timer UI
var timerChart1 = Harel.create({
  states: ['running', 'paused', 'reset', 'finished'],
  events: {
    START: [['paused', 'running'], ['reset', 'running']],
    PAUSE: ['running', 'paused'],
    RESET: [['running', 'reset'], ['finished', 'reset'], ['paused', 'reset']],
    DONE: ['running', 'finished']
  },
  initial: {reset: true}
})

var c2 = timerChart.event('START') // c2.states -> {running: true}
var c3 = c2.event('PAUSE') // c3.states -> {paused: true}
// alternative syntax:
var c4 = Harel.event('RESET', c3) // c4.states -> {reset: true}
```

They support parallel states -- simply set multiple states to `true` in the `initial` property.

## API

```js
var Harel = require('harel')
```

### Harel.create(options)

Create a new `chart` instance with some options. You can set these props in the options:

* `states`: array of state names (strings)
* `events`: object of event names mapped to `[source, dest]` state name pairs.
* `initial`: object of initial active states, like `{running: true, valid: true}`

Each value in `events` can be a single pair like `['running', 'paused']`, where the event can transition *from* "running" *to* "paused". Or it can be an array of pairs (like `[['x', 'y'], ['a', 'b']]`)

Returns a `chart` instance with these props:

* `.event(eventName)` -- fire an event and return a new chart (see below)
* `.states` -- object of active states. Each key is a state name and each val a bool.

It will throw an error if a state is unreachable, if a state name is invalid, or if any state transition is ambiguous.

### Harel.event(eventName, chart), chart.event(eventName)

Trigger a state transition using an event name. You can either call this as a method on a chart instance or as a function with a chart instance as the second argument.

This returns a **new** chart instance with a new `.states` property.

It will throw an error if the event is invalid.

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install harel
```

## Acknowledgments

Thanks to [davidnpiano](https://github.com/davidkpiano) for giving [a talk](https://www.youtube.com/watch?v=VU1NKX6Qkxc) about them.

## See Also

- [Original paper about them](http://www.inf.ed.ac.uk/teaching/courses/seoc/2005_2006/resources/statecharts.pdf)
- [xstate](https://github.com/davidkpiano/xstate/) -- a good alternate implementation

## License

MIT

