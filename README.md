# Harel Statecharts

> Harel Statecharts in javascript for declarative UI

Harel statecharts are a declarative way to describe user interface behavior. They're fun to make and easy to maintain. This library has a minimalistic implementation with robust support for nested and parallel charts.

## Usage

```js
var Harel = require('harel')

// A basic countdown timer UI
var timerChart1 = Harel.create({
  states: ['running', 'paused', 'reset', 'finished'],
  events: {
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

If any state is inaccessible or if any transition is ambiguous, then an error will be thrown immediately on creation.

### Harel.event(eventName, chart), chart.event(eventName)

Trigger a state transition using an event name. You can either call this as a method on a chart instance or as a function with a chart instance as the second argument.

This returns a **new** chart instance with a new `.states` property.

It will throw an error if the event is invalid.

## Nested Charts

One of the goals of this module is to have robust support for nested charts.

### Initializing a nested chart and entering its initial state

Use the `.where` property in a statechart to have a nested chart. When you transition into that chart, you can enter its initial state.

```js
const c1 = Chart.create({
  states: ['s1', 'nested'],
  events: { PUSH: ['s1', 'nested.initial'] },
  initial: {s1: true},
  where: {
    nested: {
      initial: {a1: true},
      states: ['a1']
    }
  }
})
const c2 = c1.event('PUSH')
t.deepEqual(c2.states, {nested: {a1: true}})
```

If you initialize a parent chart to have a nested chart active, then it will automatically set the nested chart's initial state:

```js
const c1 = Chart.create({
  states: ['nested'],
  initial: {nested: true},
  where: {
    nested: {
      initial: {a1: true},
      states: ['a1']
    }
  }
})
t.deepEqual(c2.states, {nested: {a1: true}})
```

Notice in the above that instead of setting `.states` to `{nested: true}`, it set it to `{nested: {a1: true}}` using nested's initial state.

#### Transition into a specific state

Instead of transitioning into a nested chart's initial state, you can transition into a specific state:

```js
const c1 = Chart.create({
  states: ['s1', 'nested'],
  events: { PUSH: ['s1', 'nested.b1'] },
  initial: {s1: true},
  where: {
    nested: {
      initial: {a1: true},
      states: ['a1', 'b1']
    }
  }
})
const c2 = c1.event('PUSH')
t.deepEqual(c2.states, {nested: {a1: true, b1: true}})
```

Here we specifically transition into `c1.b1` instead of into its initial state. Notice that it keeps the initial state active.

### Transitioning between nested charts

You can transition from a specific state within one nested chart to a specific or initial state in another nested chart.

```js
const c1 = Chart.create({
  states: ['n1', 'n2'],
  events: { JUMP: ['n1.a1', 'n2.initial'] },
  initial: {n1: true},
  where: {
    n1: {
      initial: {a1: true},
      states: ['a1']
    },
    n2: {
      initial: {a1: true},
      states: ['a1']
    }
  }
})
const c2 = c1.event('JUMP')
t.deepEqual(c2.states, {n2: {a1: true}})
```

### Transitioning within a nested chart

To fire an event in a nested chart, prepend the nested chart name before the event name:

```js
const c1 = Chart.create({
  states: ['n1'],
  initial: {n1: true},
  where: {
    n1: {
      initial: {a1: true},
      states: ['a1', 'b1'],
      events: {JUMP: ['a1', 'b1']}
    }
  }
})
const c2 = c1.event('n1.JUMP')
t.deepEqual(c2.states, {n1: {b1: true}})
```

You can also define an event in a parent chart that transitions a nested chart, if you'd like.

```js
const c1 = Chart.create({
  states: ['n1'],
  events: { JUMP: ['n1.a1', 'n1.b1'] },
  initial: {n1: true},
  where: {
    n1: {
      initial: {a1: true},
      states: ['a1', 'b1']
    }
  }
})
const c2 = c1.event('JUMP')
t.deepEqual(c2.states, {n1: {b1: true}})
```

### Transitioning into a nested chart's history

Nested charts have a special state called the "history" state that can be used to restore whatever states were active last when transitioning into the chart. 

For example, say you have a simple nested chart with its initial state active, you transition to another state in that chart, and then you exit. Finally, you re-enter the nested state using the `ENTER` transition, which will enters n1's "history" state. This means that n1 will activate its previously active states, rather than its initial states.

```js
const c1 = Chart.create({
  states: ['n1', 's1'],
  events: {
    JUMP: ['n1.a1', 'n1.b1'],
    EXIT: ['n1', 's1'],
    ENTER: ['s1', 'n1.history']
  },
  initial: {n1: true},
  where: {
    n1: {
      initial: {a1: true},
      states: ['a1', 'b1']
    }
  }
})

t.deepEqual(c1.states, {n1: {a1: true}})
const c2 = c1.event('JUMP')
t.deepEqual(c2.states, {n1: {b1: true}})
const c3 = c2.event('EXIT')
t.deepEqual(c3.states, {s1: true})
const c4 = c3.event('ENTER')
t.deepEqual(c4.states, {n1: {b1: true}})
```

### Exiting any state from a nested chart

You can exit from all/any states in a nested chart by not specifying a specific state to transition out of:

```js
const c1 = Chart.create({
  states: ['n1', 's1'],
  events: {
    EXIT: ['n1', 's1'],
  },
  initial: {n1: true},
  where: {
    n1: {
      initial: {a1: true},
      states: ['a1']
    }
  }
})

const c2 = c1.event('EXIT') // this will exit from *any* state in n1
t.deepEqual(c2.states, {s1: true})
```

### Looping on a nested chart

You can transition in a nested chart that goes from any state to a specific state within the same chart.

### Transitioning between deeply nested charts

Any of the above transitions among nested charts is equally applicable to deeply nested charts. To fire an event that lives in a deeply nested chart, you can run something like `chart.event('s1.s2.s3.EVENT_NAME')`.

To define an event that transitions a deeply nested chart, you can give an event transition pair such as `['s1.s2.s3.a1', 's1.s4.s5.b1']`.

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

