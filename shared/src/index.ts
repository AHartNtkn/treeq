export type TreeType = 'Leaf' | 'App' | 'Variable' | 'DefinitionRef';

export interface Tree {
  type: TreeType;
}

export interface Leaf extends Tree {
  type: 'Leaf';
}

export interface Variable extends Tree {
  type: 'Variable';
  name: string;
}

export interface DefinitionRef extends Tree {
  type: 'DefinitionRef';
  name: string;
}

export interface App extends Tree {
  type: 'App';
  left: Tree;
  right: Tree;
}

export const LEAF: Leaf = { type: 'Leaf' };

export function app(left: Tree, right: Tree): App {
  return { type: 'App', left, right };
}

export function variable(name: string): Variable {
  return { type: 'Variable', name };
}

export function definitionRef(name: string): DefinitionRef {
  return { type: 'DefinitionRef', name };
}

export function isLeaf(t: Tree): t is Leaf {
  return t.type === 'Leaf';
}

export function isVariable(t: Tree): t is Variable {
  return t.type === 'Variable';
}

export function isDefinitionRef(t: Tree): t is DefinitionRef {
  return t.type === 'DefinitionRef';
}

export function isApp(t: Tree): t is App {
  return t.type === 'App';
}

// Helper to check if a tree is a "Stem" (Leaf applied to something)
export function isStem(t: Tree): boolean {
  return isApp(t) && isLeaf(t.left);
}

// Fork is `△ A B` -> `App(App(Leaf, A), B)`
export function isFork(t: Tree): boolean {
  return isApp(t) && isStem(t.left);
}

// Deconstructors
export function getStemArg(t: Tree): Tree | null {
  if (!isStem(t)) return null;
  return (t as App).right;
}

export function getForkArgs(t: Tree): [Tree, Tree] | null {
  if (!isFork(t)) return null;
  const stem = (t as App).left as App;
  return [stem.right, (t as App).right];
}

// Reduction Step according to treecalcul.us/specification/
// 1. △ △ y z ⟶ y
// 2. △ (△ x) y z ⟶ x z (y z)
// 3. △ (△ w x) y △ ⟶ w
// 4. △ (△ w x) y (△ u) ⟶ x u
// 5. △ (△ w x) y (△ u v) ⟶ y u v

export function reduceStep(t: Tree): Tree | null {
  if (isLeaf(t) || isVariable(t) || isDefinitionRef(t)) return null;
  
  // Structure: ((op2 y) z)
  const app1 = t as App; 
  const z = app1.right;
  const op1 = app1.left; // (op2 y)
  
  if (isApp(op1)) {
    const y = op1.right;
    const op2 = op1.left; // op2
    
    // Rule 1: ((△ △) y) z -> y
    if (isApp(op2) && isLeaf(op2.left) && isLeaf(op2.right)) {
      return y;
    }
    
    // op2 = (△ (△ x)) -> App(Leaf, App(Leaf, x))
    if (isApp(op2) && isLeaf(op2.left) && isApp(op2.right)) {
      const stemX = op2.right; // (△ x) or (△ w x)
      
      // stemX must be an App to have .left
      if (!isApp(stemX)) return null;

      // Rule 2: stemX is (△ x). stemX.left is Leaf.
      if (isLeaf(stemX.left)) {
        const x = stemX.right;
        return app(
          app(x, z),
          app(y, z)
        );
      }
      
      // Rules 3-5: stemX is (△ w x) = ((△ w) x). stemX.left is (△ w).
      // Check stemX.left is App(Leaf, w)
      const stemXLeft = stemX.left;
      if (isApp(stemXLeft) && isLeaf(stemXLeft.left)) {
           const w = stemXLeft.right;
           const x_rule3 = stemX.right; // variable x in rule 3-5
           
           // Rule 3: arg z is Leaf
           if (isLeaf(z)) return w;
           
           // Rule 4: arg z is Stem (△ u)
           if (isApp(z) && isLeaf(z.left)) {
             return app(x_rule3, z.right);
           }
           
           // Rule 5: arg z is Fork (△ u v) -> ((△ u) v)
           if (isApp(z) && isApp(z.left) && isLeaf(z.left.left)) {
             return app(app(y, z.left.right), z.right);
           }
      }
    }
  }

  const reducedLeft = reduceStep(app1.left);
  if (reducedLeft) return app(reducedLeft, app1.right);
  
  const reducedRight = reduceStep(app1.right);
  if (reducedRight) return app(app1.left, reducedRight);

  return null;
}

export function reduce(t: Tree, maxSteps = 1000): Tree {
  let current = t;
  let steps = 0;
  while (steps < maxSteps) {
    const next = reduceStep(current);
    if (!next) break;
    current = next;
    steps++;
  }
  return current;
}

// Equality (structural)
export function equals(t1: Tree, t2: Tree): boolean {
  if (t1.type !== t2.type) return false;
  if (isLeaf(t1) && isLeaf(t2)) return true;
  if (isVariable(t1) && isVariable(t2)) return t1.name === t2.name;
  if (isDefinitionRef(t1) && isDefinitionRef(t2)) return t1.name === t2.name;
  if (isApp(t1) && isApp(t2)) {
    return equals(t1.left, t2.left) && equals(t1.right, t2.right);
  }
  return false;
}

// String representation
export function toString(t: Tree): string {
  if (isLeaf(t)) return '△';
  if (isVariable(t)) return t.name;
  if (isDefinitionRef(t)) return `<${t.name}>`;
  const leftStr = toString((t as App).left);
  const rightStr = toString((t as App).right);
  const rightNeedsParens = isApp((t as App).right);
  return `${leftStr} ${rightNeedsParens ? `(${rightStr})` : rightStr}`;
}

// --- Logic & Proofs ---

export interface Equation {
  lhs: Tree;
  rhs: Tree;
}

export interface Sequent {
  id: string;
  hypotheses: Equation[];
  goal: Equation;
}

export type RuleType = 
  | 'Reflexivity' 
  | 'Symmetry' 
  | 'Transitivity' 
  | 'Congruence' 
  | 'Reduction' 
  | 'Induction' // Cyclic reference
  | 'Hypothesis' // Use a hypothesis
  | 'Rewrite' // General rewrite
  | 'CaseSplit'; // Case analysis on a variable

export interface ProofNode {
  id: string;
  sequent: Sequent;
  rule: RuleType | null;
  children: ProofNode[];
  parentId?: string;
  backLinkTo?: string; 
}

export function createSequent(lhs: Tree, rhs: Tree, hypotheses: Equation[] = []): Sequent {
  return {
    id: Math.random().toString(36).substr(2, 9),
    hypotheses,
    goal: { lhs, rhs }
  };
}

// Substitution
export type Substitution = Record<string, Tree>;

export function substitute(t: Tree, sub: Substitution): Tree {
  if (isVariable(t)) {
    return sub[t.name] || t;
  }
  if (isApp(t)) {
    return app(substitute(t.left, sub), substitute(t.right, sub));
  }
  return t;
}

export function collectVariables(t: Tree, vars: Set<string> = new Set()): Set<string> {
  if (isVariable(t)) {
    vars.add(t.name);
  } else if (isApp(t)) {
    collectVariables(t.left, vars);
    collectVariables(t.right, vars);
  }
  return vars;
}

export function renameVariables(t: Tree, map: Record<string, string>): Tree {
  if (isVariable(t)) {
    return map[t.name] ? variable(map[t.name]!) : t;
  }
  if (isApp(t)) {
    return app(renameVariables(t.left, map), renameVariables(t.right, map));
  }
  return t;
}

// Unification (Pattern Matching only for now: Pattern vs Ground)
// Returns null if failure, or a Substitution map on success.
export function unify(pattern: Tree, target: Tree, sub: Substitution = {}): Substitution | null {  if (isVariable(pattern)) {
    const existing = sub[pattern.name];
    if (existing) {
      return equals(existing, target) ? sub : null;
    }
    return { ...sub, [pattern.name]: target };
  }

  if (isLeaf(pattern)) {
    return isLeaf(target) ? sub : null;
  }
  
  if (isDefinitionRef(pattern)) {
    return isDefinitionRef(target) && pattern.name === target.name ? sub : null;
  }

  if (isApp(pattern)) {
    if (!isApp(target)) return null;
    const s1 = unify(pattern.left, target.left, sub);
    if (!s1) return null;
    return unify(pattern.right, target.right, s1);
  }

  return null;
}

// Helper to check if `ancestor` subsumes `current` (for Cyclic Proofs)
export function checkCycle(current: Sequent, ancestor: Sequent): boolean {
  return equals(current.goal.lhs, ancestor.goal.lhs) && 
         equals(current.goal.rhs, ancestor.goal.rhs);
}