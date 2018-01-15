var flattenObj = require('flat')

function Harel (opts) {
  if (!opts.states || !Array.isArray(opts.states)) {
    throw new TypeError('Pass in a .states array')
  }
  opts = defaults(opts)
  for (var i = 0; i < opts.states.length; ++i) {
    opts.accessibleStates[opts.states[i]] = false
  }
  setInitialStates(opts.initial, opts)

  var chart = {
    nested: {},
    eventPaths: {},
    accessibleStates: opts.accessibleStates,
    states: opts.initial,
    initial: opts.initial,
    flatStates: flattenObj(opts.initial),
    event: function (name) { return event(name, this) }
  }

  // Initialize nested charts
  for (var chartName in opts.where) {
    opts.where[chartName].skipAccessibilityValidation = true
    chart.nested[chartName] = Harel(opts.where[chartName])
  }

  // `eventPaths` is an object like {EVENT_NAME: {sourceState: 'destinationState'}}
  for (var eventName in opts.events) {
    chart.eventPaths[eventName] = {}
    var pairs = opts.events[eventName]
    if (typeof pairs[0] === 'string') pairs = [pairs]
    for (var j = 0; j < pairs.length; ++j) {
      var source = pairs[j][0]
      var dest = pairs[j][1]
      if (chart.eventPaths[eventName][source]) throw new Error('Ambiguous state transition event "' + eventName + '" from state "' + source + '"')
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
    opts.accessibleStates[opts.states[i]] = false
  }
  for (var nestedName in opts.where) {
    opts.where[nestedName] = defaults(opts.where[nestedName])
  }
  return opts
}

// If some initial states activate nested charts, then we need to transition those charts
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

function event (eventName, chart) {
  var newChart = Object.assign({}, chart)
  newChart.nested = Object.assign({}, chart.nested)
  newChart.states = Object.assign({}, chart.states)
  // Handle nested event transitions within a nested chart -- eg. "c1.EVENT"
  var eventScope = eventName.split('.')
  if (eventScope.length > 1) {
    var chartName = eventScope[0]
    var nested = chart.nested[chartName]
    if (!nested) {
      throw new Error('Cannot find this nested chart: ' + eventScope[0])
    }
    if (!newChart.states[chartName]) {
      throw new Error('Cannot transition in this inactive nested chart: ' + eventScope[0])
    }
    newChart.nested[chartName] = event(eventScope.slice(1).join('.'), nested)
    newChart.states[chartName] = newChart.nested[chartName].states
    newChart.flatStates = flattenObj(newChart.states)
    return newChart
  }
  var sources = chart.eventPaths[eventName]
  var transitionCount = 0
  for (var state in chart.flatStates) {
    var statePath = state.split('.')
    var dest = sources[state]
    if (!dest && statePath.length > 1) {
      dest = sources[statePath[0]]
    }
    if (dest) {
      transition(statePath, dest, newChart)
      transitionCount += 1
    }
  }
  if (transitionCount === 0) {
    throw new Error('Invalid event "' + eventName + '" from state "' + JSON.stringify(state) + '"')
  }
  newChart.flatStates = flattenObj(newChart.states)
  return newChart
}

// TODO we don't want to mutate all these nested charts

function transition (sourcePath, destPath, chart) {
  // Unset the source
  var prev
  if (sourcePath) {
    prev = chart.states[sourcePath[0]]
    delete chart.states[sourcePath[0]]
  }
  // Set the dest -- possibly recursive
  var nested = chart.nested[destPath[0]]
  if (destPath.length === 1) {
    if (nested) {
      // Transition into nested *initial* state
      var newNested = Object.assign({states: nested.initial, flatStates: flattenObj(nested.initial)}, nested)
      chart.nested[destPath[0]] = newNested
      chart.states[destPath[0]] = newNested.initial
    } else {
      // Transition into a normal state
      if (!(destPath[0] in chart.accessibleStates)) {
        throw new Error('Cannot transition into inaccessible state: ' + destPath[0])
      }
      chart.states[destPath[0]] = true
    }
  } else if (nested) { // gt 1 -- some kind of nested chart path
    // Transition within the same nested chart
    if (sourcePath && sourcePath[0] === destPath[0]) {
      if (destPath[1] !== 'history') {
        transition(sourcePath.slice(1), destPath.slice(1), nested)
        chart.states[destPath[0]] = nested.states
      } else {
        chart.states[destPath[0]] = prev
      }
    } else {
      if (destPath[1] !== 'history') {
        // Transition into a specific state within a nested chart
        transition(null, destPath.slice(1), nested)
      }
      chart.states[destPath[0]] = nested.states
    }
  } else {
    throw new Error('Invalid transition')
  }
  chart.flatStates = flattenObj(chart.states)
}

module.exports = {
  create: Harel,
  event: event
}
