var flattenObj = require('flat')

function create (opts) {
  if (!opts.states || !Array.isArray(opts.states)) {
    throw new TypeError('Pass in a .states array')
  }
  opts = defaults(opts)
  for (var i = 0; i < opts.states.length; ++i) {
    if (opts.states[i] === 'initial') {
      throw new Error('Cannot have a state called "initial" -- it is a reserved keyword')
    }
    if (opts.states[i] === 'history') {
      throw new Error('Cannot have a state called "history" -- it is a reserved keyword')
    }
    opts.accessibleStates[opts.states[i]] = false
  }
  setInitialStates(opts.initial, opts)

  var chart = {
    nested: {},
    eventPaths: {},
    accessibleStates: opts.accessibleStates,
    states: Object.assign({}, opts.initial),
    initial: opts.initial,
    flatStates: flattenObj(opts.initial),
    event: function (name) { return event(name, this) }
  }

  // Initialize nested charts
  for (var chartName in opts.where) {
    opts.where[chartName].skipAccessibilityValidation = true
    chart.nested[chartName] = create(opts.where[chartName])
  }

  // `eventPaths` is an object like {EVENT_NAME: {sourceState: 'destinationState'}}
  for (var eventName in opts.events) {
    chart.eventPaths[eventName] = {}
    var pairs = opts.events[eventName]
    if (typeof pairs[0] === 'string') pairs = [pairs]
    for (var j = 0; j < pairs.length; ++j) {
      var source = pairs[j][0]
      var dest = pairs[j][1]
      if (chart.eventPaths[eventName][source]) {
        throw new Error('Ambiguous event "' + eventName + '" from state "' + source + '"')
      }
      // Set nested chart states as accessible
      var destPath = dest.split('.')
      setAccessiblePath(destPath, chart)
      chart.eventPaths[eventName][source] = destPath
    }
  }
  // Check for inaccessible states
  if (!opts.skipAccessibilityValidation) {
    validateAccessibility(chart)
  }
  return chart
}

// Set defaults on the options to create a chart
function defaults (opts) {
  if (!('events' in opts)) opts.events = {}
  if (!('initial' in opts)) opts.initial = {}
  if (!('where' in opts)) opts.where = {}
  if (!('accessibleStates' in opts)) opts.accessibleStates = {}
  for (var i = 0; i < opts.states.length; ++i) {
    if (!(opts.states[i] in opts.accessibleStates)) {
      opts.accessibleStates[opts.states[i]] = false
    }
  }
  for (var nestedName in opts.where) {
    opts.where[nestedName] = defaults(opts.where[nestedName])
  }
  return opts
}

// If some initial states activate nested charts, then we need to transition those charts
// For example, say the parent chart's initial state is {c1: true}
// and c1 is a nested chart with initial state {a1: true}
// then the parent initial state will get set to {c1: {a1: true}}
function setInitialStates (initial, opts) {
  if (initial === true) return opts.initial
  for (var stateName in initial) {
    if (!(stateName in opts.accessibleStates)) {
      throw new Error('Invalid initial state: ' + stateName + ' not found')
    }
    opts.accessibleStates[stateName] = true
    if (stateName in opts.where) {
      opts.initial[stateName] = setInitialStates(initial[stateName], opts.where[stateName])
    } else {
      opts.initial[stateName] = true
    }
  }
  return opts.initial
}

// Validate that all states are accessible
function validateAccessibility (chart) {
  for (var state in chart.accessibleStates) {
    if (!chart.accessibleStates[state]) {
      throw new Error('Inaccessible state "' + state + '"')
    }
  }
  for (var chartName in chart.nested) {
    validateAccessibility(chart.nested[chartName])
  }
}

// Given a path of nested states, like ['x1', 'y1', 'z1']
// Mark each state as accessible in their respective charts
function setAccessiblePath (path, chart) {
  chart.accessibleStates[path[0]] = true
  var nested = chart.nested[path[0]]
  if (nested && path.length > 1) {
    return setAccessiblePath(path.slice(1), nested)
  }
}

// Fire a state transition event
// Return a new chart with a possibly different state and set of nested charts
function event (eventName, chart) {
  var newChart = cloneChart(chart)

  // Handle nested event transitions within a nested chart -- eg. "c1.EVENT"
  var eventScope = eventName.split('.')
  if (eventScope.length > 1) {
    var chartName = eventScope[0]
    var nested = chart.nested[chartName]
    if (!nested) {
      throw new Error('Invalid nested event "' + eventName + '". Cannot find the nested chart called "' + eventScope[0] + '"')
    }
    if (!newChart.states[chartName]) {
      throw new Error('Invalid nested event "' + eventName + '". Cannot transition from an inactive nested chart called "' + eventScope[0] + '"')
    }
    var subEvent = eventScope.slice(1).join('.')
    newChart.nested[chartName] = event(subEvent, nested)
    newChart.states[chartName] = newChart.nested[chartName].states
    newChart.flatStates = flattenObj(newChart.states)
    return newChart
  }

  var paths = chart.eventPaths[eventName]
  var transitionCount = 0
  for (var source in chart.flatStates) {
    var destPath = paths[source]
    var sourcePath = source.split('.')
    // Handle transitions that come from the edge of a nested chart -- not from a specific nested state
    // Eg. the state may be {'c1.a1': true}, but a valid path from there can be {c1: ['x']}
    if (!destPath && sourcePath.length > 1) {
      destPath = paths[sourcePath[0]]
    }
    if (destPath) {
      exit(sourcePath, newChart, eventName)
      enter(destPath, newChart, eventName)
      transitionCount += 1
    }
  }
  if (transitionCount === 0) {
    throw new Error('Invalid event "' + eventName + '" from state "' + JSON.stringify(chart.states) + '"')
  }
  return newChart
}

function exit (sourcePath, chart, eventName) {
  var isActive = sourcePath[0] in chart.states
  if (!isActive) {
    throw new Error('Invalid event ' + eventName + ' -- trying to exit from inactive or missing state: ' + sourcePath[0] + '. Active states are: ' + JSON.stringify(chart.states))
  }
  chart._prev = chart.states
  chart.states = Object.assign({}, chart.states)
  delete chart.states[sourcePath[0]]
  if (sourcePath.length > 1) {
    var nested = chart.nested[sourcePath[0]]
    exit(sourcePath.slice(1), nested, eventName)
  }
}

function enter (destPath, chart, eventName) {
  var isAccessible = destPath[0] in chart.accessibleStates
  if (!isAccessible) {
    throw new Error('Cannot transition into inaccessible state "' + destPath[0] + '" in event "' + eventName + '". Accessible states are: ' + Object.keys(chart.accessibleStates))
  }
  var isDeep = destPath.length > 1
  var nested = chart.nested[destPath[0]]
  if (destPath[0] === 'history') {
    chart.states = chart._prev || Object.assign({}, chart.initial)
  } else if (destPath[0] === 'initial') {
    chart.states = Object.assign({}, chart.initial)
  } else {
    chart.states[destPath[0]] = true
  }

  if (nested) {
    if (!isDeep) {
      throw new Error('To transition into a nested chart, specify "history", "initial", or a specific state in that nested chart. Failed on "' + destPath[0] + '" from event "' + eventName + '"')
    }
    var newNested = cloneChart(nested)
    enter(destPath.slice(1), newNested, eventName)
    chart.nested[destPath[0]] = newNested
    chart.states[destPath[0]] = newNested.states
  }
  chart.flatStates = flattenObj(chart.states)
}

// Clone a chart, shallow-cloning some of its properties
function cloneChart (chart) {
  return Object.assign({
    states: Object.assign({}, chart.states),
    flatStates: Object.assign({}, chart.flatStates),
    nested: Object.assign({}, chart.nested)
  }, chart)
}

module.exports = { create: create, event: event }
