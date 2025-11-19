import { useState } from 'react';
import type { Tree } from '@treeq/shared';
import { TreeViewer } from './TreeViewer';
import { FormulaBuilder } from './FormulaBuilder';

export interface DefinitionItem {
  id: string;
  name: string;
  value: Tree;
}

interface DefinitionsProps {
  definitions: DefinitionItem[];
  onSave: (def: DefinitionItem) => void;
  onDelete: (id: string) => void;
}

export const Definitions = ({ definitions, onSave, onDelete }: DefinitionsProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'name' | 'value'>('name');
  const [newName, setNewName] = useState('');

  const handleStartCreate = () => {
    setIsCreating(true);
    setStep('name');
    setNewName('');
  };

  const handleNameNext = () => {
    if (newName) setStep('value');
  };

  const handleValueComplete = (tree: Tree) => {
    const newDef: DefinitionItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      value: tree
    };
    onSave(newDef);
    setIsCreating(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-400">Definitions</h2>
        <button 
          onClick={handleStartCreate}
          className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded font-bold"
        >
          + New Definition
        </button>
      </div>

      {definitions.length === 0 ? (
        <div className="text-gray-500 italic text-center p-8">No definitions yet.</div>
      ) : (
        <div className="grid gap-4">
          {definitions.map(def => (
            <div key={def.id} className="bg-gray-900 border border-gray-700 p-4 rounded flex justify-between items-center">
              <div>
                <div className="font-bold text-white text-lg mb-2">{def.name}</div>
                <div className="h-16 border border-gray-800 rounded bg-black/50 overflow-hidden relative w-64">
                   <div className="absolute inset-0 flex justify-center items-center scale-75">
                     <TreeViewer tree={def.value} />
                   </div>
                </div>
              </div>
              <button 
                onClick={() => onDelete(def.id)}
                className="text-red-500 hover:text-red-400 px-3 py-1"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {isCreating && (
        step === 'name' ? (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded border border-gray-700 w-96">
              <h3 className="text-xl font-bold text-white mb-4">New Definition</h3>
              <input 
                className="w-full bg-black text-white p-2 rounded mb-4 border border-gray-700"
                placeholder="Name (e.g. I, K, S)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsCreating(false)} className="text-gray-400 px-4 py-2">Cancel</button>
                <button 
                  disabled={!newName}
                  onClick={handleNameNext} 
                  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <FormulaBuilder 
            onComplete={handleValueComplete} 
            onCancel={() => setIsCreating(false)} 
            definitions={definitions}
            allowVariables={false}
          />
        )
      )}
    </div>
  );
};
