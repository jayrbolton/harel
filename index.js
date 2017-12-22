var statechart = {}
module.exports = statechart

statechart.create = create
function create (config) {
  var accessible = {}
  var initialCount = 0
  for (var i = 0; i < config.states.length; ++i) {
    var name = config.states[i]
    accessible[name] = false
    if (config.initial[name]) initialCount += 1
  }
  if (initialCount === 0) throw new Error('You must sent an initial set of states')

  // `events` is an object like {EVENT_NAME: {sourceState: 'destinationState'}}
  var events = {}
  for (var eventName in config.events) {
    events[eventName] = {}
    var pairs = config.events[eventName]
    if (typeof pairs[0] === 'string') pairs = [pairs]
    for (var j = 0; j < pairs.length; ++j) {
      var source = pairs[j][0]
      var dest = pairs[j][1]
      if (!accessible.hasOwnProperty(source)) throw new Error('Invalid transition from: ' + source)
      if (!accessible.hasOwnProperty(dest)) throw new Error('Invalid transition to: ' + dest)
      if (events[eventName][source]) throw new Error('Ambiguous state transition event "' + eventName + '" from state "' + source + '"')
      events[eventName][source] = dest
      accessible[source] = true
      accessible[dest] = true
    }
  }

  // Check for inaccessible states
  for (var state in accessible) {
    if (!accessible[state]) {
      throw new Error('Inaccessible state "' + state + '"')
    }
  }

  var chart = {
    states: config.initial,
    event: function (name) { return event(name, chart) },
    eventPaths: events
  }
  return chart
}

statechart.event = event
function event (eventName, chart) {
  var sources = chart.eventPaths[eventName]
  if (!sources) throw new Error('Unrecognized event: ' + eventName)
  var newStates = {}
  var transitionCount = 0
  for (var state in chart.states) {
    var dest = sources[state]
    if (dest) {
      newStates[dest] = true
      transitionCount += 1
    } else {
      newStates[state] = chart.states[state]
    }
  }
  if (transitionCount === 0) {
    throw new Error('Invalid event "' + eventName + '" from state "' + JSON.stringify(state) + '"')
  }
  var newChart = {
    states: newStates,
    event: function (name) { return event(name, newChart) },
    eventPaths: chart.eventPaths
  }
  return newChart
}
