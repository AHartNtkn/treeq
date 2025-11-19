import { useState } from 'react';
import { app, LEAF, variable, definitionRef } from '@treeq/shared';
import type { Tree, App, Variable, DefinitionRef } from '@treeq/shared';
import type { VisualTree, TreeNode } from '../lib/layout';
import { TreeViewer } from './TreeViewer';
import type { DefinitionItem } from './Definitions';

interface FormulaBuilderProps {
  onComplete: (tree: Tree) => void;
  onCancel: () => void;
  definitions?: DefinitionItem[];
  allowVariables?: boolean;
  title?: string;
}

export const FormulaBuilder = ({ onComplete, onCancel, definitions = [], allowVariables = true, title = "Construct Formula" }: FormulaBuilderProps) => {
  // Initial state: a single Hole
  const [buildState, setBuildState] = useState<VisualTree>({ type: 'Hole', id: 'root' });
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>('root');
  const [varName, setVarName] = useState('x');
  const [showDefSelect, setShowDefSelect] = useState(false);

  // Helper to find first hole
  const findFirstHole = (t: VisualTree): string | null => {
    if (t.type === 'Hole') return t.id;
    if (t.type === 'App') {
      const appNode = t as App;
      const leftHole = findFirstHole(appNode.left as VisualTree);
      if (leftHole) return leftHole;
      return findFirstHole(appNode.right as VisualTree);
    }
    return null;
  };

  // Convert VisualTree to actual Tree (throws if holes remain)
  const toTree = (bt: VisualTree): Tree => {
    if (bt.type === 'Hole') throw new Error('Cannot finish with holes!');
    if (bt.type === 'Leaf') return LEAF;
    if (bt.type === 'Variable') return variable((bt as Variable).name);
    if (bt.type === 'DefinitionRef') return definitionRef((bt as DefinitionRef).name);
    if (bt.type === 'App') {
      const appNode = bt as App;
      return app(toTree(appNode.left as VisualTree), toTree(appNode.right as VisualTree));
    }
    throw new Error('Unknown type');
  };

  // Helper to replace a hole with a new subtree
  const replaceHole = (tree: VisualTree, id: string, replacement: VisualTree): VisualTree => {
    if (tree.type === 'Hole') {
      return tree.id === id ? replacement : tree;
    }
    if (tree.type === 'App') {
      const appNode = tree as App;
      return {
        type: 'App',
        left: replaceHole(appNode.left as VisualTree, id, replacement),
        right: replaceHole(appNode.right as VisualTree, id, replacement)
      } as unknown as VisualTree;
    }
    return tree;
  };

  const handleFill = (type: 'Leaf' | 'App' | 'Variable' | 'DefinitionRef', name?: string) => {
    if (!selectedHoleId) return;

    let replacement: VisualTree;
    if (type === 'Leaf') {
      replacement = { type: 'Leaf' };
    } else if (type === 'Variable') {
      replacement = { type: 'Variable', name: varName } as Variable;
    } else if (type === 'DefinitionRef') {
      replacement = { type: 'DefinitionRef', name: name! } as DefinitionRef;
    } else {
      // App creates two new holes
      const id = Math.random().toString(36).substr(2, 9);
      replacement = {
        type: 'App',
        left: { type: 'Hole', id: id + 'L' } as VisualTree,
        right: { type: 'Hole', id: id + 'R' } as VisualTree
      } as App;
    }

    const newState = replaceHole(buildState, selectedHoleId, replacement);
    setBuildState(newState);
    
    // Auto-select next hole
    // If we created an App, select left child.
    // If we filled with leaf/var, find next available hole in tree.
    if (type === 'App') {
      // The left child of the replacement is the new hole.
      // We know its ID.
      // Actually simpler: just traverse the *new state* and find the first hole.
      // Since layout is usually left-to-right DFS, this naturally selects "left child" or "next sibling".
      // EXCEPT if we are filling a hole deep in the tree, `findFirstHole` starts from root.
      // That's actually exactly what we want: fill holes in order.
      const next = findFirstHole(newState);
      setSelectedHoleId(next);
    } else {
      const next = findFirstHole(newState);
      setSelectedHoleId(next);
    }
    
    setShowDefSelect(false);
  };

  const [hoveredDef, setHoveredDef] = useState<DefinitionItem | null>(null);

  // ... existing helpers ...

  // Helper to replace a node at a specific path (layout ID) with a Hole
  const pruneBranch = (tree: VisualTree, pathId: string): VisualTree => {
    // pathId format: "root", "root.L", "root.L.R"
    if (pathId === 'root') {
      return { type: 'Hole', id: 'root' };
    }

    const parts = pathId.replace('root.', '').split('.');
    const [next, ...rest] = parts;

    if (tree.type === 'App') {
      // We need to reconstruct the App with the modified branch
      // Casting to App is safe because we are traversing down an existing path
      const appNode = tree as any; 
      if (next === 'L') {
        return {
          ...appNode,
          left: rest.length === 0 
            ? { type: 'Hole', id: Math.random().toString(36).substr(2, 9) } 
            : pruneBranch(appNode.left, pathId.replace('root.L', 'root')) // Recurse with adjusted root? No.
            // Recursion logic: We just need to follow the 'L' or 'R'.
            // The recursive call should handle the REST of the path.
            // My path passing logic is slightly off.
            // Let's just pass the *remaining* path parts?
            // Or simpler:
        };
      }
    }
    return tree;
  };

  // Better implementation of prune
  const replaceAtPath = (tree: VisualTree, pathParts: string[]): VisualTree => {
    if (pathParts.length === 0) {
      // Reached target: Replace with Hole
      return { type: 'Hole', id: Math.random().toString(36).substr(2, 9) };
    }

    const [next, ...rest] = pathParts;
    if (tree.type === 'App') {
      const appNode = tree as any;
      if (next === 'L') {
        return { ...appNode, left: replaceAtPath(appNode.left, rest) };
      } else if (next === 'R') {
        return { ...appNode, right: replaceAtPath(appNode.right, rest) };
      }
    }
    return tree;
  };

  const handleNodeClick = (node: TreeNode) => {
    if (node.data.type === 'Hole') {
      setSelectedHoleId((node.data as any).id);
    } else {
      // Prune/Undo feature: Clicking a non-hole turns it into a hole
      if (confirm("Reset this branch?")) {
        const parts = node.id.replace('root', '').split('.').filter(p => p);
        const newState = replaceAtPath(buildState, parts);
        setBuildState(newState);
        // The new hole ID is unknown here because replaceAtPath generated it.
        // But we can find it? Or replaceAtPath could return { tree, newHoleId }.
        // Or just auto-select first hole.
        const next = findFirstHole(newState);
        setSelectedHoleId(next);
      }
    }
  };

  const handleFinish = () => {
    console.log('FormulaBuilder: Finish clicked');
    try {
      const finalTree = toTree(buildState);
      console.log('FormulaBuilder: Tree converted successfully', finalTree);
      onComplete(finalTree);
    } catch (e: any) {
      console.error('FormulaBuilder Error:', e);
      // Find first hole and select it
      const holeId = findFirstHole(buildState);
      if (holeId) {
        setSelectedHoleId(holeId);
        alert("Please fill all holes before finishing."); 
      } else {
        // If no hole found but error occurred, show the real error
        alert("Error building formula: " + e.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 w-full max-w-2xl relative flex flex-col h-[80vh]">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        
        <div className="bg-black rounded mb-4 flex-1 overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
             <TreeViewer 
               tree={buildState} 
               onNodeClick={handleNodeClick} 
               isNodeSelected={(n) => n.data.type === 'Hole' && (n.data as any).id === selectedHoleId} 
             />
          </div>
        </div>

        <div className="flex gap-4 items-end mb-6 flex-wrap relative">
          <button onClick={() => handleFill('Leaf')} disabled={!selectedHoleId} className="bg-green-700 px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50">Leaf (△)</button>
          <button onClick={() => handleFill('App')} disabled={!selectedHoleId} className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">App (@)</button>
          
          {allowVariables && (
            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
               <span className="text-sm text-gray-400">Var:</span>
               <input 
                 className="bg-black text-white px-2 py-1 w-12 rounded" 
                 value={varName} 
                 onChange={e => setVarName(e.target.value)} 
               />
               <button onClick={() => handleFill('Variable')} disabled={!selectedHoleId} className="bg-yellow-700 px-3 py-1 rounded hover:bg-yellow-600 text-sm disabled:opacity-50">Add</button>
            </div>
          )}

          {definitions.length > 0 && (
            <div className="relative">
              <button 
                onClick={() => setShowDefSelect(!showDefSelect)} 
                disabled={!selectedHoleId}
                className="bg-purple-700 px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
              >
                Def...
              </button>
              {showDefSelect && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded w-48 max-h-60 overflow-y-auto z-10 shadow-lg">
                  {definitions.map(def => (
                    <div 
                      key={def.id} 
                      onClick={() => handleFill('DefinitionRef', def.name)}
                      onMouseEnter={() => setHoveredDef(def)}
                      onMouseLeave={() => setHoveredDef(null)}
                      className="p-2 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-700 last:border-0"
                    >
                      {def.name}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Definition Preview Tooltip */}
              {showDefSelect && hoveredDef && (
                <div className="absolute bottom-full left-52 mb-2 bg-gray-900 border border-gray-500 rounded p-2 shadow-xl z-20 w-48 pointer-events-none">
                  <div className="text-xs text-gray-400 mb-1">Preview: {hoveredDef.name}</div>
                  <div className="h-24 relative bg-black/50 rounded">
                    <div className="absolute inset-0 flex items-center justify-center scale-50">
                      <TreeViewer tree={hoveredDef.value} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 border-t border-gray-800 pt-4">
          <button onClick={onCancel} className="text-gray-400 hover:text-white">Cancel</button>
          <button 
            onClick={handleFinish} 
            className={`px-6 py-2 rounded font-bold ${!findFirstHole(buildState) ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 text-gray-400'}`}
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
};
