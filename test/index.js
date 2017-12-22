const test = require('tape')
const Chart = require('..')

test('it throws an error on ambiguous state transitions', t => {
  t.throws(() => {
    Chart.create({ states: ['s1', 's2'], events: {AMBIG: [['s1', 's2'], ['s1', 's1']]}, initial: {s1: true} })
  }, 'throws ambiguity err')
  t.end()
})

test('it throws an error on an inaccessible state', t => {
  t.throws(() => {
    Chart.create({ states: ['s1', 's2'], events: {NOPE: [['s1', 's1']]}, initial: {} })
  }, 'throws inaccessibility err')
  t.ok(() => {
    Chart.create({ states: ['s1', 's2'], events: {NOPE: [['s1', 's2']]}, initial: {} })
  }, 'ok when a state is only a dest')
  t.end()
})

test('it throws an error if an event transitions to a missing state', t => {
  t.throws(() => {
    Chart.create({ states: ['s1'], events: {NOPE: ['s1', 's2']}, initial: {} })
  }, 'throws inaccessibility err')
  t.end()
})

test('gives a new correct state on a transition event', t => {
  const c1 = Chart.create({states: ['s1', 's2'], events: {EV: ['s1', 's2']}, initial: {s1: true}})
  t.assert(c1.states.s1)
  t.notOk(c1.states.s2)
  const c2 = c1.event('EV')
  t.assert(c2.states.s2)
  t.notOk(c2.states.s1)
  t.end()
})

test('transitions correctly on loops', t => {
  const c1 = Chart.create({states: ['s1'], events: {EV: ['s1', 's1']}, initial: {s1: true}})
  t.assert(c1.states.s1)
  const c2 = Chart.event('EV', c1)
  t.assert(c2.states.s1)
  t.end()
})

test('it throws an error with a blank initial state', t => {
  t.throws(() => Chart.create({states: ['s1'], events: {EV: ['s1', 's1']}, initial: {}}))
  t.end()
})

test('it throws an error when transition on a valid event that is inaccessible', t => {
  const c1 = Chart.create({states: ['s1', 's2'], events: {LOOP: ['s1', 's1'], MOVE: ['s1', 's2']}, initial: {s2: true}})
  t.throws(() => Chart.event('LOOP', c1))
  t.end()
})
