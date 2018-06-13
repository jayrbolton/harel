// const flattenObj = require('flat')

// Options can include:
// events: object of event names matched to state transitions {EV: ['s1', 's2']}

module.exports = create

function create (events) {
  const eventPaths = {}
  for (const eventName in events) {
    let pairs = events[eventName]
    eventPaths[eventName] = new Map()
    // Construct a mapping of: {EVENT: {fromState: toState, ..}, ..}
    if (!Array.isArray(pairs[0])) {
      // Not an array of arrays
      pairs = [pairs]
    }
    for (let i = 0; i < pairs.length; ++i) {
      const pair = pairs[i]
      if (pair.length !== 2) {
        throw new Error('Pass in an array of pairs of state transitions. Invalid pair: ' + pair)
      }
      if (eventPaths[eventName].has(pair[0])) {
        throw new Error('Ambigous state transition in event: ' + eventName)
      }
      eventPaths[eventName].set(pair[0], pair[1])
    }
  }
  return transition(eventPaths)
}

function transition (eventPaths) {
  return function (state, event) {
    if (!(event in eventPaths)) {
      throw new Error('Invalid event "' + event + '". Valid events: ' + Object.keys(eventPaths))
    }
    const transitions = eventPaths[event]
    if (!transitions.has(state)) {
      throw new Error('Cannot fire event "' + event + '" from state "' + state +
        '". Valid states are: ' + Array.from(transitions.keys()))
    }
    return transitions.get(state)
  }
}

create.nested = function nested (chart, nested) {
  const resultChart = create({})
  return resultChart
}

create.parallel = function parallel (charts) {
  const chart = create({})
  return chart
}
