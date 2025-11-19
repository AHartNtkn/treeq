import { app, LEAF, variable, createSequent, definitionRef } from '@treeq/shared';
import type { TheoremItem } from './components/Library';
import type { DefinitionItem } from './components/Definitions';

// Base Definitions
const K_VAL = app(LEAF, LEAF);
const FALSE_VAL = app(LEAF, app(LEAF, definitionRef('K')));
const I_VAL = app(definitionRef('False'), definitionRef('K'));

export const INITIAL_DEFINITIONS: DefinitionItem[] = [
  {
    id: 'def_k',
    name: 'K',
    value: K_VAL
  },
  {
    id: 'def_false',
    name: 'False',
    value: FALSE_VAL
  },
  {
    id: 'def_i',
    name: 'I',
    value: I_VAL
  }
];

export const INITIAL_LIBRARY: TheoremItem[] = [
  {
    id: 'thm_k',
    name: 'K Reduction',
    sequent: (() => {
      const y = variable('y');
      const z = variable('z');
      // K y z = y
      const lhs = app(app(definitionRef('K'), y), z);
      const rhs = y;
      return createSequent(lhs, rhs, []);
    })(),
    proof: {}
  },
  {
    id: 'thm_false',
    name: 'False Reduction',
    sequent: (() => {
      const y = variable('y');
      const z = variable('z');
      // False y z = z
      const lhs = app(app(definitionRef('False'), y), z);
      const rhs = z;
      return createSequent(lhs, rhs, []);
    })(),
    proof: {}
  },
  {
    id: 'thm_i',
    name: 'Identity (I)',
    sequent: (() => {
      const x = variable('x');
      // I x = x
      const lhs = app(definitionRef('I'), x);
      const rhs = x;
      return createSequent(lhs, rhs, []);
    })(),
    proof: {}
  }
];
