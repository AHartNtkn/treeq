import { useState, useEffect } from 'react'
import { LEAF, app, reduceStep } from '@treeq/shared'
import type { Tree, Sequent } from '@treeq/shared'
import { TreeViewer } from './components/TreeViewer'
import { ProofAssistant } from './components/ProofAssistant'
import { Library } from './components/Library'
import { Definitions } from './components/Definitions'
import type { TheoremItem } from './components/Library'
import type { DefinitionItem } from './components/Definitions'
import { INITIAL_LIBRARY, INITIAL_DEFINITIONS } from './initialLibrary'
import { NewConjectureModal } from './components/NewConjectureModal'

function App() {
  const [mode, setMode] = useState<'explorer' | 'proof' | 'library' | 'definitions'>('library');
  const [activeProblem, setActiveProblem] = useState<{ sequent: Sequent, name: string, proof: any } | null>(null);
  const [showNewConjecture, setShowNewConjecture] = useState(false);
  
  const [theorems, setTheorems] = useState<TheoremItem[]>(() => {
    const saved = localStorage.getItem('treeq-library');
    return saved ? JSON.parse(saved) : INITIAL_LIBRARY;
  });

  const [definitions, setDefinitions] = useState<DefinitionItem[]>(() => {
    const saved = localStorage.getItem('treeq-definitions');
    return saved ? JSON.parse(saved) : INITIAL_DEFINITIONS;
  });

  useEffect(() => {
    localStorage.setItem('treeq-library', JSON.stringify(theorems));
  }, [theorems]);

  useEffect(() => {
    localStorage.setItem('treeq-definitions', JSON.stringify(definitions));
  }, [definitions]);

  // ... explorer state ...
  const initialTree = app(app(LEAF, LEAF), LEAF); 
  const [tree, setTree] = useState<Tree>(initialTree);
  const [history, setHistory] = useState<Tree[]>([initialTree]);

  const handleStep = () => {
    const next = reduceStep(tree);
    if (next) {
      setTree(next);
      setHistory([...history, next]);
    }
  };

  const handleReset = () => {
    setTree(history[0]!);
    setHistory([history[0]!]);
  };

  const handleLoadTheorem = (sequent: Sequent, name: string, proof: any) => {
    setActiveProblem({ sequent, name, proof });
    setMode('proof');
  };

  const handleCommitProof = (proof: any, isComplete: boolean) => {
    if (!activeProblem) return;
    setTheorems(prev => prev.map(t => 
      t.name === activeProblem.name ? { 
        ...t, 
        proof,
        status: isComplete ? 'proven' : 'wip'
      } : t
    ));
    setMode('library');
  };

  const handleSaveNewConjecture = (item: TheoremItem) => {
    setTheorems(prev => [...prev, item]);
    setShowNewConjecture(false);
  };

  const handleSaveDefinition = (def: DefinitionItem) => {
    setDefinitions(prev => [...prev, def]);
  };

  const handleDeleteDefinition = (id: string) => {
    setDefinitions(prev => prev.filter(d => d.id !== id));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (json.theorems && Array.isArray(json.theorems)) {
          setTheorems(json.theorems);
          setDefinitions(json.definitions || []);
        } else if (Array.isArray(json)) {
          // Legacy format support
          setTheorems(json);
        } else {
          alert('Invalid library format');
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const data = { theorems, definitions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'treeq-library.json';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex justify-between items-center mb-8 px-4">
        <div className="flex gap-4">
          <button 
            onClick={() => setMode('library')}
            className={`px-4 py-2 rounded font-bold ${mode === 'library' ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            Library
          </button>
          <button 
            onClick={() => setMode('definitions')}
            className={`px-4 py-2 rounded font-bold ${mode === 'definitions' ? 'bg-blue-700' : 'bg-gray-700'}`}
          >
            Definitions
          </button>
          <button 
            onClick={() => setMode('proof')}
            className={`px-4 py-2 rounded font-bold ${mode === 'proof' ? 'bg-green-600' : 'bg-gray-700'}`}
          >
            Proof Workspace
          </button>
          <button 
            onClick={() => setMode('explorer')}
            className={`px-4 py-2 rounded font-bold ${mode === 'explorer' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Explorer
          </button>
        </div>

        {(mode === 'library' || mode === 'definitions') && (
          <div className="flex gap-2">
            {mode === 'library' && (
              <button 
                onClick={() => setShowNewConjecture(true)}
                className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded font-bold mr-4"
              >
                + New Conjecture
              </button>
            )}
            <label className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded font-bold cursor-pointer">
              Import
              <input type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
            <button 
              onClick={handleExport}
              className="bg-yellow-700 hover:bg-yellow-600 px-4 py-2 rounded font-bold"
            >
              Export
            </button>
          </div>
        )}
      </div>

      {showNewConjecture && (
        <NewConjectureModal 
          onSave={handleSaveNewConjecture} 
          onCancel={() => setShowNewConjecture(false)}
          definitions={definitions}
        />
      )}

      {mode === 'library' && (
        <Library theorems={theorems} onLoadTheorem={handleLoadTheorem} />
      )}

      {mode === 'definitions' && (
        <Definitions definitions={definitions} onSave={handleSaveDefinition} onDelete={handleDeleteDefinition} />
      )}

      {mode === 'proof' && (
        <ProofAssistant 
          initialSequent={activeProblem?.sequent} 
          initialProof={activeProblem?.proof}
          problemName={activeProblem?.name}
          onCommit={handleCommitProof}
          library={theorems}
          definitions={definitions}
        />
      )}

      {mode === 'explorer' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">Tree Calculus Explorer</h1>
          <div className="flex justify-center gap-4">
            <button 
              onClick={handleStep}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold"
            >
              Step Reduce
            </button>
            <button 
              onClick={handleReset}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-semibold"
            >
              Reset
            </button>
          </div>

          <TreeViewer tree={tree} />

          <div className="bg-gray-800 p-4 rounded text-sm font-mono overflow-x-auto">
            <h3 className="font-bold text-gray-400 mb-2">Debug Info:</h3>
            <pre>{JSON.stringify(tree, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default App