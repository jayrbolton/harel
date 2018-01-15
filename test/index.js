const test = require('tape')
const Chart = require('..')

test('it throws errors on ambiguous state transitions', t => {
  const ambig = { states: ['s1', 's2'], events: {AMBIG: [['s1', 's2'], ['s1', 's1']]}, initial: {s1: true} }
  t.throws(() => Chart.create(ambig), 'throws ambiguity err')
  t.throws(() => {
    Chart.create({
      states: 'c1',
      initial: {c1: true},
      where: { c1: { ambig } }
    })
  }, 'nested ambiguity')
  t.end()
})

test('it throws an error on an inaccessible state', t => {
  const nope = { states: ['s1', 's2'], events: {NOPE: [['s1', 's1']]}, initial: {} }
  t.throws(() => Chart.create(nope), 'throws inaccessibility err')
  t.ok(() => {
    Chart.create({ states: ['s1', 's2'], events: {NOPE: [['s1', 's2']]}, initial: {} })
  }, 'ok when a state is only a dest')
  t.throws(() => {
    Chart.create({
      states: ['c1'],
      initial: {c1: true},
      where: { c1: nope }
    })
  }, 'nested inaccessible')
  t.end()
})

test('it throws an error if an event transitions to a missing state', t => {
  const missing = { states: ['s1'], events: {NOPE: ['s1', 's2']}, initial: {} }
  t.throws(() => Chart.create(missing), 'throws inaccessibility err')
  t.throws(() => {
    Chart.create({ states: ['c1'], where: {c1: missing} })
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
  t.ok(() => Chart.event('MOVE', c1))
  t.end()
})

test('nested charts: transition to an initial state', t => {
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

test('nested charts: transition to a specific state', t => {
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

test('nested charts: transition within the same nested chart from the parent', t => {
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

test('nested charts: transition within the same nested chart from a nested event', t => {
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

test('nested charts: initially setting a nested chart to true automatically initializes nested state', t => {
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

test("nested charts: initially setting a nested chart sets the nested chart's state", t => {
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

test('nested charts: transition from a double-nested state to another double-nested state', t => {
  const c = {initial: {a1: true}, states: ['a1']}
  const cp = {initial: {c1: true}, states: ['c1'], where: {c1: c}}
  const parent = Chart.create({
    states: ['c1', 'c2'],
    events: { TRANS: ['c1.c1.a1', 'c2.c1.a1'] },
    initial: {c1: {c1: {a1: true}}},
    where: {
      c1: cp,
      c2: cp
    }
  })
  const p2 = parent.event('TRANS')
  t.deepEqual(p2.states, {c2: {c1: {a1: true}}})
  t.end()
})

test('nested charts: transition into historical nested state', t => {
  const p1 = Chart.create({
    states: ['a1', 'c1'],
    events: {
      PUSH: ['a1', 'c1.history'],
      POP: [['c1.b1', 'a1'], ['c1.a1', 'a1']]
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
  const p4 = p3.event('POP')
  t.deepEqual(p4.states, {a1: true})
  const p5 = p4.event('PUSH')
  t.deepEqual(p5.states, {c1: {b1: true}})
  t.end()
})

test('nested charts: loop back on the nested chart from any state to the history (just a no-op)', t => {
  const p1 = Chart.create({
    states: ['c1'],
    events: {
      LOOP: ['c1', 'c1.history']
    },
    initial: {c1: true},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'b1'],
        events: {LOOP: [['a1', 'b1'], ['b1', 'a1']]}
      }
    }
  })
  t.deepEqual(p1.states, {c1: {a1: true}}, 'initial push goes to nested initial states')
  const p2 = p1.event('LOOP')
  t.deepEqual(p2.states, {c1: {a1: true}})
  const p3 = p2.event('c1.LOOP').event('LOOP')
  t.deepEqual(p3.states, {c1: {b1: true}})
  t.end()
})

test('nested charts: loop back on the nested chart from any state to the initial', t => {
  const p1 = Chart.create({
    states: ['c1'],
    events: {
      LOOP: ['c1', 'c1']
    },
    initial: {c1: true},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'b1'],
        events: {LOOP: [['a1', 'b1'], ['b1', 'a1']]}
      }
    }
  })
  t.deepEqual(p1.states, {c1: {a1: true}}, 'initial push goes to nested initial states')
  const p2 = p1.event('LOOP')
  t.deepEqual(p2.states, {c1: {a1: true}})
  const p3 = p2.event('c1.LOOP').event('LOOP')
  t.deepEqual(p3.states, {c1: {a1: true}})
  t.end()
})

test('nested charts: exit from a specific state to a parent state', t => {
  const p1 = Chart.create({
    states: ['a1', 'c1'],
    events: {
      EXIT: ['c1.a1', 'a1']
    },
    initial: {c1: true},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'b1'],
        events: {E: ['a1', 'b1']}
      }
    }
  })
  t.deepEqual(p1.states, {c1: {a1: true}}, 'initial push goes to nested initial states')
  const p2 = p1.event('EXIT')
  t.deepEqual(p2.states, {a1: true})
  t.throws(() => p1.event('c1.E').event('EXIT'))
  t.end()
})

test('nested charts: exit from any state to a parent state', t => {
  const p1 = Chart.create({
    states: ['a1', 'c1'],
    events: {
      EXIT: ['c1', 'a1']
    },
    initial: {c1: true},
    where: {
      c1: {
        initial: {a1: true},
        states: ['a1', 'b1'],
        events: {E: ['a1', 'b1']}
      }
    }
  })
  t.deepEqual(p1.states, {c1: {a1: true}}, 'initial push goes to nested initial states')
  const p2 = p1.event('c1.E').event('EXIT')
  t.deepEqual(p2.states, {a1: true})
  t.end()
})
