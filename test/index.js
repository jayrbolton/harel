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

test('nested emulation', t => {
  // ATM example
  const atm = {
    method: Chart({SWITCH: [['check', 'cash'], ['cash', 'check']]}),
    step: Chart({NEXT: ['method', 'pay'], PREV: ['pay', 'method']})
  }
  let method = 'cash'
  let step = 'method'
  method = atm.method(method, 'SWITCH')
  step = atm.step(step, 'NEXT')
  step = atm.step(step, 'PREV')
  t.strictEqual(method, 'check')
  t.strictEqual(step, 'method')
  t.end()
})

/* const cc = parallel([c1, c2])
 * const cc = nest(step, {method: method})
 *
 * parallel function
 * nesting function
 *
  const c = Chart.compose({
    method: {
      chart: method,
      nested: {step: 'method'}
    },
    step: {
      chart: step
    }
  })

  let s = {method: 'cash', step: 'method'}
  s = c(s, 'SWITCH') // {method: 'check', step: 'method'}
  s = c(s, 'NEXT') // {method: 'check', step: 'pay'}
  s = c(s, 'SWITCH') // invalid -- method is inactive
  s = c(s, 'PREV') // {method: 'check', step: 'method'}
  s = c(s, 'SWITCH') // {method: 'cash', step: 'method'}
  s = c(s, 'SWITCH') // {method: 'cash', step: 'pay'}
*/
