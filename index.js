
function Harel (config) {
  if (!(this instanceof Harel)) return new Harel(config)
  var accessible = {}
  var initialCount = 0
  for (var i = 0; i < config.states.length; ++i) {
    var name = config.states[i]
    accessible[name] = false
    if (config.initial[name]) initialCount += 1
  }
  if (initialCount === 0) throw new Error('You must set an initial set of states')
  // `eventPaths` is an object like {EVENT_NAME: {sourceState: 'destinationState'}}
  var eventPaths = {}
  for (var eventName in config.events) {
    eventPaths[eventName] = {}
    var pairs = config.events[eventName]
    if (typeof pairs[0] === 'string') pairs = [pairs]
    for (var j = 0; j < pairs.length; ++j) {
      var source = pairs[j][0]
      var dest = pairs[j][1]
      if (!accessible.hasOwnProperty(source)) throw new Error('Invalid transition from: ' + source)
      if (!accessible.hasOwnProperty(dest)) throw new Error('Invalid transition to: ' + dest)
      if (eventPaths[eventName][source]) throw new Error('Ambiguous state transition event "' + eventName + '" from state "' + source + '"')
      eventPaths[eventName][source] = dest
      accessible[source] = true
      accessible[dest] = true
      // Handle transitions to nested states within nested charts (eg. {JUMP: ['x', 'y', 'z', 'q']})
      if (pairs[j][2]) {
        eventPaths[eventName[source]] = {[dest]: pairs[j][2]}
      }
    }
  }
  // Check for inaccessible states
  for (var state in accessible) {
    if (!accessible[state]) {
      throw new Error('Inaccessible state "' + state + '"')
    }
  }
  // Handle nested charts
  var nested = {}
  /*
  config.where = config.where || {}
  for (var chartName in config.where) {
    if (config.where[chartName]._statechart) {
      nested[chartName] = Harel(config.where[chartName])
    } else {
      nested[chartName] = config.where[chartName]
    }
  }
  */
  this.states = config.initial
  this.eventPaths = eventPaths
  this._statechart = true
  this.nested = nested
  return this
}

Harel.prototype.event = function (name) { return event(name, this) }

function event (eventName, chart) {
  var sources = chart.eventPaths[eventName]
  if (!sources) throw new Error('Unrecognized event: ' + eventName)
  var newStates = {}
  var transitionCount = 0
  for (var state in chart.states) {
    var dest = sources[state]
    if (dest) {
      transitionCount += 1
      // Handle nested transition to its initial state
      /*
      if (chart.nested[dest]) {
        if (typeof sources[state] === 'object') {
          var nestedState = sources[state]
          newStates[dest] = sources[state]
          newStates[dest] = Object.assign({states: sources[state], newStates[dest]})
        } else {
          newStates[dest] = chart.nested[dest].initial
        }
      } else {
      */
      newStates[dest] = true
      // }
    } else {
      newStates[state] = chart.states[state]
    }
  }
  if (transitionCount === 0) {
    throw new Error('Invalid event "' + eventName + '" from state "' + JSON.stringify(state) + '"')
  }
  var newChart = Object.assign(chart, {states: newStates})
  return newChart
}

module.exports = {
  create: Harel,
  event: event
}
