import { useState, useMemo, useEffect } from 'react';
import { createSequent, reduceStep, equals, unify, substitute, isDefinitionRef, collectVariables, renameVariables, variable, app, LEAF, isVariable } from '@treeq/shared';
import type { ProofNode, Sequent, Tree, Equation } from '@treeq/shared';
import { SequentView } from './SequentView';
import { ProofState } from '../lib/proof-state';
import { FormulaBuilder } from './FormulaBuilder';
import { replaceNode } from '../lib/tree-utils';
import { TreeViewer } from './TreeViewer';
import type { TheoremItem } from './Library';
import type { TreeNode } from '../lib/layout';
import type { DefinitionItem } from './Definitions';

interface ProofAssistantProps {
  initialSequent?: Sequent | null;
  initialProof?: any;
  problemName?: string;
  onCommit: (proof: any, isComplete: boolean) => void;
  library: TheoremItem[];
  definitions?: DefinitionItem[];
}

export const ProofAssistant = ({ initialSequent, initialProof, problemName, onCommit, library, definitions = [] }: ProofAssistantProps) => {
  const [proofState, setProofState] = useState<ProofState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [showTransitivity, setShowTransitivity] = useState(false);
  const [showTheoremSelect, setShowTheoremSelect] = useState(false);
  
  // Selected subterm in the current goal (for Rewrite)
  // We need to know if it's in LHS or RHS. 
  // TreeViewer renders LHS and RHS separately in SequentView.
  // I need SequentView to bubble up clicks with "side" info?
  // Or just rely on ID? IDs are "root...", but SequentView renders two trees.
  // I need to track which tree was clicked.
  const [selectedSubterm, setSelectedSubterm] = useState<{ side: 'lhs' | 'rhs', node: TreeNode } | null>(null);

  useEffect(() => {
    if (initialProof && initialProof.root) {
      const state = ProofState.fromJSON(initialProof);
      setProofState(state);
      setSelectedNodeId(state.root.id);
      setVersion(0);
    } else if (initialSequent) {
      const state = new ProofState(initialSequent);
      setProofState(state);
      setSelectedNodeId(state.root.id);
      setVersion(0);
    } else {
      setProofState(null);
    }
  }, [initialSequent, initialProof]);

  const handleCommit = () => {
    if (!proofState) return;
    onCommit({ root: proofState.root }, proofState.isComplete());
  };

  const selectedNode = useMemo(() => {
    if (!proofState || !selectedNodeId) return null;
    return proofState.getNode(selectedNodeId);
  }, [proofState, selectedNodeId, version]);

  // ... existing handlers (Reduce, Reflexivity, Symmetry, Transitivity) ...
  const handleReduceLHS = () => {
    if (!selectedNode || !proofState) return;
    const currentSeq = selectedNode.sequent;
    const reduced = reduceStep(currentSeq.goal.lhs);
    if (reduced) {
      const newGoal = { ...currentSeq.goal, lhs: reduced };
      const newSequent = createSequent(newGoal.lhs, newGoal.rhs, currentSeq.hypotheses);
      proofState.applyRule(selectedNode.id, 'Reduction', [newSequent]);
      setSelectedNodeId(selectedNode.children[0]!.id);
      setVersion(v => v + 1);
    } else {
      alert("LHS cannot be reduced further.");
    }
  };

  const handleReduceRHS = () => {
    if (!selectedNode || !proofState) return;
    const currentSeq = selectedNode.sequent;
    const reduced = reduceStep(currentSeq.goal.rhs);
    if (reduced) {
      const newGoal = { ...currentSeq.goal, rhs: reduced };
      const newSequent = createSequent(newGoal.lhs, newGoal.rhs, currentSeq.hypotheses);
      proofState.applyRule(selectedNode.id, 'Reduction', [newSequent]);
      setSelectedNodeId(selectedNode.children[0]!.id);
      setVersion(v => v + 1);
    } else {
      alert("RHS cannot be reduced further.");
    }
  };

  const handleReflexivity = () => {
    if (!selectedNode || !proofState) return;
    const { lhs, rhs } = selectedNode.sequent.goal;
    if (equals(lhs, rhs)) {
      proofState.applyRule(selectedNode.id, 'Reflexivity', []);
      setSelectedNodeId(null);
      setVersion(v => v + 1);
    } else {
      alert("Goal is not reflexive (LHS != RHS).");
    }
  };

  const handleSymmetry = () => {
    if (!selectedNode || !proofState) return;
    const { lhs, rhs } = selectedNode.sequent.goal;
    const newSequent = createSequent(rhs, lhs, selectedNode.sequent.hypotheses);
    proofState.applyRule(selectedNode.id, 'Symmetry', [newSequent]);
    setSelectedNodeId(selectedNode.children[0]!.id);
    setVersion(v => v + 1);
  };

  const handleTransitivity = (intermediate: Tree) => {
    if (!selectedNode || !proofState) return;
    const { lhs, rhs } = selectedNode.sequent.goal;
    const seq1 = createSequent(lhs, intermediate, selectedNode.sequent.hypotheses);
    const seq2 = createSequent(intermediate, rhs, selectedNode.sequent.hypotheses);
    proofState.applyRule(selectedNode.id, 'Transitivity', [seq1, seq2]);
    setShowTransitivity(false);
    setSelectedNodeId(selectedNode.children[0]!.id);
    setVersion(v => v + 1);
  };

  const checkInduction = () => {
    if (!selectedNode || !proofState) return;
    let curr: ProofNode | undefined = selectedNode;
    let parentId = curr.parentId;
    while (parentId) {
      const parent = proofState.getNode(parentId);
      if (!parent) break;
      if (equals(parent.sequent.goal.lhs, selectedNode.sequent.goal.lhs) &&
          equals(parent.sequent.goal.rhs, selectedNode.sequent.goal.rhs)) {
         proofState.applyRule(selectedNode.id, 'Induction', [], parent.id);
         setSelectedNodeId(null);
         setVersion(v => v + 1);
         return;
      }
      parentId = parent.parentId;
    }
    alert("No matching ancestor found for induction.");
  };

  // --- New Tactics ---

  const handleRewrite = (eq: Equation) => {
    if (!selectedNode || !proofState || !selectedSubterm) {
      alert("Select a subterm in the goal first.");
      return;
    }

    const targetTree = selectedSubterm.node.data as Tree;
    
    // Check for match (rigid equality for assumptions)
    // TODO: Support Theorem rewriting (unification) if eq comes from theorem? 
    // For now, this is "Use Assumption" (rigid).
    if (!equals(eq.lhs, targetTree)) {
      alert("Assumption LHS does not match selected subterm.");
      return;
    }

    // Perform replacement
    const currentGoal = selectedNode.sequent.goal;
    let newLhs = currentGoal.lhs;
    let newRhs = currentGoal.rhs;

    if (selectedSubterm.side === 'lhs') {
      newLhs = replaceNode(newLhs, selectedSubterm.node.id, eq.rhs);
    } else {
      newRhs = replaceNode(newRhs, selectedSubterm.node.id, eq.rhs);
    }

    const newSequent = createSequent(newLhs, newRhs, selectedNode.sequent.hypotheses);
    proofState.applyRule(selectedNode.id, 'Rewrite', [newSequent]);
    setSelectedNodeId(selectedNode.children[0]!.id);
    setVersion(v => v + 1);
    setSelectedSubterm(null);
  };

  const getFreshName = (base: string, used: Set<string>): string => {
    let name = base;
    let i = 1;
    while (used.has(name)) {
      name = `${base}${i++}`;
    }
    return name;
  };

  const handleCaseSplit = () => {
    if (!selectedNode || !proofState || !selectedSubterm) return;

    const targetTree = selectedSubterm.node.data as Tree;
    // Safe to cast because button is disabled otherwise
    const varName = (targetTree as any).name; 
    const sequent = selectedNode.sequent;
    
    // Collect all used variables in the sequent
    const usedVars = new Set<string>();
    collectVariables(sequent.goal.lhs, usedVars);
    collectVariables(sequent.goal.rhs, usedVars);
    sequent.hypotheses.forEach(h => {
      collectVariables(h.lhs, usedVars);
      collectVariables(h.rhs, usedVars);
    });

    // Case 1: x -> Leaf
    const subLeaf = { [varName]: LEAF };
    
    // Case 2: x -> Stem(y)
    const y = getFreshName('y', usedVars);
    usedVars.add(y); // Mark as used
    const subStem = { [varName]: app(LEAF, variable(y)) };

    // Case 3: x -> Fork(y, z) - REUSE y from above? No, fresh z.
    // Actually standard names are nice. Let's generate fresh for each case independent of others?
    // No, subgoals are independent branches.
    // But names should not collide with parent context.
    // Reusing 'y' from Stem case in Fork case is confusing?
    // Let's use fresh names for Fork too.
    // Re-calc fresh for Fork.
    // const y2 = getFreshName('y', usedVars); 
    
    const z = getFreshName('z', usedVars);
    const subFork = { [varName]: app(app(LEAF, variable(y)), variable(z)) }; 
    // Note: I reused `y` variable logic. `y` is fresh wrt `usedVars`. 
    // `z` is fresh wrt `usedVars`.
    // If `y` == `z`?
    // getFreshName('y') vs getFreshName('z').
    // If root has neither, y='y', z='z'. distinct.
    // If root has 'y', y='y1'.
    
    // Construct subgoals by applying substitutions
    const applySub = (s: Sequent, sub: Record<string, Tree>): Sequent => ({
      id: Math.random().toString(36).substr(2, 9), // new ID
      hypotheses: s.hypotheses.map(h => ({ lhs: substitute(h.lhs, sub), rhs: substitute(h.rhs, sub) })),
      goal: { lhs: substitute(s.goal.lhs, sub), rhs: substitute(s.goal.rhs, sub) }
    });

    const goalLeaf = applySub(sequent, subLeaf);
    const goalStem = applySub(sequent, subStem);
    const goalFork = applySub(sequent, subFork);

    proofState.applyRule(selectedNode.id, 'CaseSplit', [goalLeaf, goalStem, goalFork]);
    setSelectedNodeId(selectedNode.children[0]!.id);
    setVersion(v => v + 1);
    setSelectedSubterm(null);
  };

  const handleApplyTheorem = (thm: TheoremItem) => {
    if (!selectedNode || !proofState) return;
    
    const goal = selectedNode.sequent.goal;
    
    // Capture Avoidance: Rename theorem variables
    const seqVars = new Set<string>();
    collectVariables(goal.lhs, seqVars);
    collectVariables(goal.rhs, seqVars);
    selectedNode.sequent.hypotheses.forEach(h => {
      collectVariables(h.lhs, seqVars);
      collectVariables(h.rhs, seqVars);
    });

    const thmVars = new Set<string>();
    collectVariables(thm.sequent.goal.lhs, thmVars);
    collectVariables(thm.sequent.goal.rhs, thmVars);
    thm.sequent.hypotheses.forEach(h => {
      collectVariables(h.lhs, thmVars);
      collectVariables(h.rhs, thmVars);
    });

    const renameMap: Record<string, string> = {};
    thmVars.forEach(v => {
      const newName = getFreshName(v, seqVars);
      renameMap[v] = newName;
      seqVars.add(newName); // Update set so next var doesn't collide
    });

    const renamedThmGoalLhs = renameVariables(thm.sequent.goal.lhs, renameMap);
    const renamedThmGoalRhs = renameVariables(thm.sequent.goal.rhs, renameMap);
    
    // Try to unify
    let sub = unify(renamedThmGoalLhs, goal.lhs);
    if (sub) {
      sub = unify(renamedThmGoalRhs, goal.rhs, sub);
    }

    if (!sub) {
      alert("Theorem goal does not unify with current goal.");
      return;
    }

    // Instantiate Hypotheses
    const newSubgoals = thm.sequent.hypotheses.map(h => {
      const hLhs = renameVariables(h.lhs, renameMap);
      const hRhs = renameVariables(h.rhs, renameMap);
      return {
        lhs: substitute(hLhs, sub!),
        rhs: substitute(hRhs, sub!)
      };
    }).map(eq => createSequent(eq.lhs, eq.rhs, selectedNode.sequent.hypotheses));

    proofState.applyRule(selectedNode.id, 'Hypothesis', newSubgoals); 
    
    setShowTheoremSelect(false);
    if (newSubgoals.length > 0) {
      setSelectedNodeId(selectedNode.children[0]!.id);
    } else {
      setSelectedNodeId(null); // Closed
    }
    setVersion(v => v + 1);
  };

  const handleUnfold = () => {
    if (!selectedNode || !proofState || !selectedSubterm) {
      alert("Select a definition in the goal first.");
      return;
    }

    const targetTree = selectedSubterm.node.data as Tree;
    
    if (!isDefinitionRef(targetTree)) {
      alert("Selected term is not a definition.");
      return;
    }

    const def = definitions.find(d => d.name === targetTree.name);
    if (!def) {
      alert(`Definition '${targetTree.name}' not found in library.`);
      return;
    }

    // Replace ref with value
    const currentGoal = selectedNode.sequent.goal;
    let newLhs = currentGoal.lhs;
    let newRhs = currentGoal.rhs;

    if (selectedSubterm.side === 'lhs') {
      newLhs = replaceNode(newLhs, selectedSubterm.node.id, def.value);
    } else {
      newRhs = replaceNode(newRhs, selectedSubterm.node.id, def.value);
    }

    const newSequent = createSequent(newLhs, newRhs, selectedNode.sequent.hypotheses);
    proofState.applyRule(selectedNode.id, 'Rewrite', [newSequent]); 
    setSelectedNodeId(selectedNode.children[0]!.id);
    setVersion(v => v + 1);
    setSelectedSubterm(null);
  };

  if (!proofState) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-gray-500">No Active Proof</h2>
        <p className="text-gray-400">Please select a theorem from the Library to prove.</p>
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-6xl mx-auto flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center mb-4">
         <div className="flex items-baseline gap-4">
           <h2 className="text-2xl font-bold text-green-400">Proof Workspace</h2>
           {problemName && <span className="text-xl text-white font-mono">{problemName}</span>}
         </div>
         <div className="flex items-center gap-4">
           <div className="text-sm text-gray-400">
             Status: {proofState.isComplete() ? <span className="text-green-400 font-bold">COMPLETE</span> : <span className="text-yellow-400">IN PROGRESS</span>}
           </div>
           <button onClick={handleCommit} className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded font-bold text-white">
             Save to Library
           </button>
         </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-1/4 bg-gray-900 border border-gray-700 rounded p-4 overflow-y-auto">
          <h3 className="font-bold mb-4 text-gray-300">Proof Tree</h3>
          <ProofTreeItem node={proofState.root} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
        </div>

        <div className="flex-1 flex flex-col gap-4">
           <div className="bg-gray-900 border border-gray-700 rounded p-4 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[300px]">
             {selectedNode ? (
               <>
                 <div className="mb-2 text-gray-500 uppercase text-xs tracking-wider">Current Goal</div>
                 <div className="scale-110">
                   {/* Custom render of SequentView to capture clicks */}
                   <div className="flex flex-col items-center gap-4">
                      <div className="flex flex-wrap gap-4 justify-center w-full">
                        {selectedNode.sequent.hypotheses.length === 0 ? (
                          <div className="text-gray-500 italic text-xs">No hypotheses</div>
                        ) : (
                          selectedNode.sequent.hypotheses.map((hyp, i) => (
                            <div 
                              key={i} 
                              className="scale-75 origin-top bg-gray-800 p-2 rounded cursor-pointer hover:bg-gray-700 border border-gray-600"
                              onClick={() => handleRewrite(hyp)}
                              title="Click to Rewrite with this assumption"
                            >
                              <SequentView sequent={{ id: 'hyp', hypotheses: [], goal: hyp }} />
                            </div>
                          ))
                        )}
                      </div>
                      <div className="w-full h-1 bg-white my-2"></div>
                      <div className="flex items-center gap-4">
                        <div className={`border-2 p-2 rounded ${selectedSubterm?.side === 'lhs' ? 'border-blue-500 bg-blue-900/20' : 'border-transparent'}`}>
                           <TreeViewer 
                             tree={selectedNode.sequent.goal.lhs} 
                             onNodeClick={(n: TreeNode) => setSelectedSubterm({ side: 'lhs', node: n })}
                             isNodeSelected={(n) => selectedSubterm?.side === 'lhs' && selectedSubterm.node.id === n.id}
                           />
                        </div>
                        <div className="text-2xl font-bold text-gray-400">=</div>
                        <div className={`border-2 p-2 rounded ${selectedSubterm?.side === 'rhs' ? 'border-blue-500 bg-blue-900/20' : 'border-transparent'}`}>
                           <TreeViewer 
                             tree={selectedNode.sequent.goal.rhs} 
                             onNodeClick={(n: TreeNode) => setSelectedSubterm({ side: 'rhs', node: n })}
                             isNodeSelected={(n) => selectedSubterm?.side === 'rhs' && selectedSubterm.node.id === n.id}
                           />
                        </div>
                      </div>
                   </div>
                 </div>
                 {selectedNode.rule && (
                   <div className="mt-4 text-green-400 text-sm">
                     Closed by: <span className="font-bold">{selectedNode.rule}</span>
                     {selectedNode.backLinkTo && " (Cycle)"}
                   </div>
                 )}
               </>
             ) : (
               <div className="text-gray-500 italic">Select a node from the tree to work on it.</div>
             )}
           </div>

           <div className="h-1/3 bg-gray-800 rounded p-4 overflow-y-auto">
             <h3 className="font-bold mb-2 text-gray-300">Tactics</h3>
             <div className="flex flex-wrap gap-2">
               <button onClick={handleReduceLHS} disabled={!selectedNode || !!selectedNode.rule} className="tactic-btn">Reduce LHS</button>
               <button onClick={handleReduceRHS} disabled={!selectedNode || !!selectedNode.rule} className="tactic-btn">Reduce RHS</button>
               <button onClick={handleReflexivity} disabled={!selectedNode || !!selectedNode.rule} className="tactic-btn bg-green-800 hover:bg-green-700">Reflexivity</button>
               <button onClick={handleSymmetry} disabled={!selectedNode || !!selectedNode.rule} className="tactic-btn">Symmetry</button>
               <button onClick={() => setShowTransitivity(true)} disabled={!selectedNode || !!selectedNode.rule} className="tactic-btn">Transitivity...</button>
               <button onClick={handleUnfold} disabled={!selectedNode || !!selectedNode.rule || !selectedSubterm} className="tactic-btn bg-yellow-800 hover:bg-yellow-700">Unfold Def</button>
               <button 
                 onClick={handleCaseSplit} 
                 disabled={!selectedNode || !!selectedNode.rule || !selectedSubterm || !isVariable(selectedSubterm.node.data as Tree)} 
                 className="tactic-btn bg-orange-800 hover:bg-orange-700"
               >
                 Case Split
               </button>
               <button onClick={() => setShowTheoremSelect(true)} disabled={!selectedNode || !!selectedNode.rule} className="tactic-btn bg-blue-800 hover:bg-blue-700">Apply Theorem...</button>
               <button onClick={checkInduction} disabled={!selectedNode || !!selectedNode.rule} className="tactic-btn bg-purple-800 hover:bg-purple-700">Induction (Cycle)</button>
             </div>
             <div className="mt-2 text-xs text-gray-400">
               Tip: To use an Assumption, select a subterm in the goal, then click the hypothesis.
             </div>
           </div>
        </div>
      </div>

      {showTransitivity && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
           <div className="w-full max-w-2xl">
             <FormulaBuilder onComplete={handleTransitivity} onCancel={() => setShowTransitivity(false)} />
           </div>
        </div>
      )}

      {showTheoremSelect && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
           <div className="bg-gray-900 p-6 rounded border border-gray-700 w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
             <h3 className="text-xl font-bold text-white mb-4">Apply Theorem</h3>
             <div className="overflow-y-auto flex-1 space-y-2">
               {library.filter(t => t.status === 'proven').map(thm => (
                 <button 
                   key={thm.id}
                   onClick={() => handleApplyTheorem(thm)}
                   className="w-full text-left bg-gray-800 p-3 rounded hover:bg-gray-700 border border-gray-600"
                 >
                   <div className="font-bold text-white">{thm.name}</div>
                   <div className="scale-75 origin-left mt-2">
                     <SequentView sequent={thm.sequent} />
                   </div>
                 </button>
               ))}
               {library.filter(t => t.status === 'proven').length === 0 && (
                 <div className="text-gray-500 italic text-center">No proven theorems available.</div>
               )}
             </div>
             <button onClick={() => setShowTheoremSelect(false)} className="mt-4 text-gray-400 hover:text-white">Cancel</button>
           </div>
        </div>
      )}
    </div>
  );
};

const ProofTreeItem = ({ node, selectedId, onSelect }: { node: ProofNode, selectedId: string | null, onSelect: (id: string) => void }) => {
  return (
    <div className="ml-4">
      <div 
        className={`cursor-pointer text-sm py-1 px-2 rounded mb-1 flex items-center gap-2 ${node.id === selectedId ? 'bg-blue-900 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
        onClick={() => onSelect(node.id)}
      >
        <div className={`w-2 h-2 rounded-full ${node.rule ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        <span className="truncate font-mono">{node.id}</span>
        {node.rule && <span className="text-xs text-gray-500">({node.rule})</span>}
      </div>
      {node.children.map(child => (
        <ProofTreeItem key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
};


