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

test('it throws an error when transition on a valid event that is inaccessible', t => {
  const c1 = Chart.create({states: ['s1', 's2'], events: {LOOP: ['s1', 's1'], MOVE: ['s1', 's2']}, initial: {s2: true}})
  t.throws(() => Chart.event('LOOP', c1))
  t.end()
})

test('transition to a nested chart with an initial state', t => {
  const p1 = Chart.create({
    states: ['s1', 'c1'],
    events: { PUSH: ['s1', 'c1'] },
    initial: {s1: true},
    where: {
      c1: {
        initial: {a1: true, b1: true},
        states: ['a1', 'b1'],
        events: {}
      }
    }
  })
  const p2 = p1.event('PUSH')
  t.deepEqual(p2.states, {c1: {a1: true, b1: true}})
  t.end()
})

test('transition to a nested chart with a specific state', t => {
  const parent = Chart.create({
    states: ['s1', 'c1'],
    events: { PUSH: ['s1', 'c1.b1'] },
    initial: {s1: true},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'b1'],
        events: {}
      }
    }
  })
  const p2 = parent.event('PUSH')
  t.deepEqual(p2.states, {c1: {a1: true, b1: true}})
  t.end()
})

test('transition within the same nested chart from the parent', t => {
  const p1 = Chart.create({
    states: ['c1'],
    events: { LOOP: [['c1.a1', 'c1.b1'], ['c1.b1', 'c1.a1']] },
    initial: {c1: {a1: true}},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'b1']
      }
    }
  })
  t.deepEqual(p1.states, {c1: {a1: true}})
  const p2 = p1.event('LOOP')
  t.deepEqual(p2.states, {c1: {b1: true}})
  const p3 = p2.event('LOOP')
  t.deepEqual(p3.states, {c1: {a1: true}})
  t.end()
})

test('transition within the same nested chart from a nested event', t => {
  const p1 = Chart.create({
    states: ['c1'],
    initial: {c1: {a1: true}},
    where: {
      c1: {
        initial: {a1: true},
        events: {'LOOP': [['a1', 'b1'], ['b1', 'a1']]},
        states: ['a1', 'b1']
      }
    }
  })
  t.deepEqual(p1.states, {c1: {a1: true}})
  const p2 = p1.event('c1.LOOP')
  t.deepEqual(p2.states, {c1: {b1: true}})
  const p3 = p2.event('c1.LOOP')
  t.deepEqual(p3.states, {c1: {a1: true}})
  t.end()
})

test('initially setting a nested chart sets its initial state automatically', t => {
  const p1 = Chart.create({
    states: ['c1'],
    initial: {c1: true},
    where: {
      c1: {
        states: ['a1'],
        initial: {a1: true}
      }
    }
  })
  t.deepEqual(p1.states, {c1: {a1: true}})
  t.end()
})

test("initially setting a nested chart states the nested chart's state", t => {
  const p1 = Chart.create({
    states: ['c1'],
    initial: {c1: {c2: {b1: true, c3: true}}},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'c2'],
        where: {
          c2: {
            initial: {a1: true},
            states: ['a1', 'b1', 'c3'],
            where: {
              c3: {
                initial: {a1: true},
                states: ['a1']
              }
            }
          }
        }
      }
    }
  })
  t.deepEqual(p1.states, {c1: {a1: true, c2: {a1: true, b1: true, c3: {a1: true}}}})
  t.deepEqual(p1.nested.c1.states, {a1: true, c2: {a1: true, b1: true, c3: {a1: true}}})
  t.deepEqual(p1.nested.c1.nested.c2.states, {a1: true, b1: true, c3: {a1: true}})
  t.deepEqual(p1.nested.c1.nested.c2.nested.c3.states, {a1: true})
  t.end()
})

test("nested charts: transition to a double-nested chart's initial state", t => {
  const parent = Chart.create({
    states: ['s1', 'c1'],
    events: { PUSH: ['s1', 'c1.c2'] },
    initial: {s1: true},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'c2'],
        events: {},
        where: {
          c2: {
            initial: {g1: true},
            states: ['g1'],
            events: {}
          }
        }
      }
    }
  })
  const p2 = parent.event('PUSH')
  t.deepEqual(p2.states, {c1: {a1: true, c2: {g1: true}}})
  t.end()
})

test("nested charts: transition to a double-nested chart's specific state", t => {
  const parent = Chart.create({
    states: ['s1', 'c1'],
    events: { PUSH: ['s1', 'c1.c2.h1'] },
    initial: {s1: true},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'c2'],
        events: {},
        where: {
          c2: {
            initial: {g1: true},
            states: ['g1', 'h1'],
            events: {}
          }
        }
      }
    }
  })
  const p2 = parent.event('PUSH')
  t.deepEqual(p2.states, {c1: {a1: true, c2: {g1: true, h1: true}}})
  t.end()
})

test('nested charts: transition from a nested state to another nested state', t => {
  const parent = Chart.create({
    states: ['c1', 'c2'],
    events: { TRANS: ['c1.a1', 'c2.a1'] },
    initial: {c1: {a1: true}},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1'],
        events: {}
      },
      c2: {
        initial: {a1: true},
        states: ['a1'],
        events: {}
      }
    }
  })
  const p2 = parent.event('TRANS')
  t.deepEqual(p2.states, {c2: {a1: true}})
  t.end()
})

test.skip('nested charts: transition into historical nested state', t => {
  const p1 = Chart.create({
    states: ['a1', 'c1'],
    events: {
      PUSH: ['a1', 'c1.history'],
      POP: ['c1.b1', 'a1']
    },
    initial: {a1: true},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'b1'],
        events: {LOOP: [['a1', 'b1'], ['b1', 'a1']]}
      }
    }
  })
  const p2 = p1.event('PUSH')
  t.deepEqual(p2.states, {c1: {a1: true}}, 'initial push goes to nested initial states')
  const p3 = p2.event('c1.LOOP')
  t.deepEqual(p3.states, {c1: {b1: true}})
  const p4 = p2.event('POP')
  t.deepEqual(p4.states, {a1: true})
  const p5 = p2.event('PUSH')
  t.deepEqual(p5.states, {c1: {b1: true}})
  t.end()
})

// TODO
// - transition into chart history
// - loop on nested chart, no specific inner states
// - exit from specific nested chart state
// - exit from any nested chart state
