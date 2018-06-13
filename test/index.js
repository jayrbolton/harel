const test = require('tape')
const Chart = require('..')

test('basic transitions', t => {
  const c1 = Chart({EV: [['s1', 's2'], ['s2', 's1']]})

  let state = 's1'
  state = c1(state, 'EV')
  t.strictEqual(state, 's2')
  state = c1(state, 'EV')
  t.strictEqual(state, 's1')
  t.end()
})

test('basic loop', t => {
  const chart = Chart({EV: ['s1', 's1']})
  let state = 's1'
  state = chart(state, 'EV')
  t.strictEqual(state, 's1')
  t.end()
})

test('it throws an error on a non-existent event', t => {
  const chart = Chart({EV: ['s1', 's1']})
  let state = 's1'
  t.throws(() => chart(state, 'EVX'))
  t.end()
})

test('it throws an error on an invalid state for event', t => {
  const chart = Chart({EV: ['s1', 's1']})
  let state = 'sx'
  t.throws(() => chart(state, 'EV'))
  t.end()
})

test('it throws errors on ambiguous state transitions', t => {
  t.throws(() => {
    Chart({EV: [['s1', 's2'], ['s1', 's3']]})
  })
  t.end()
})

test('nested chart', t => {
  // ATM example
  const method = Chart({SWITCH: [['check', 'cash'], ['cash', 'check']]})
  const step = Chart({NEXT: ['method', 'pay'], PREV: ['pay', 'method']})
  let payment = Chart.nested(step, {
    method: {method: method}
  })
  let S = {root: 'method', method: 'cash'}
  S = payment(S, 'SWITCH')
  t.deepEqual(S, {root: 'method', method: 'check'})
  S = payment(S, 'NEXT')
  t.deepEqual(S, {root: 'pay', method: 'check'})
  // Cannot switch method from the "pay" step
  t.throws(() => payment(S, 'SWITCH'))
  t.end()
})
