import { useState } from 'react';
import { createSequent } from '@treeq/shared';
import type { Tree, Equation } from '@treeq/shared';
import { FormulaBuilder } from './FormulaBuilder';
import { TreeViewer } from './TreeViewer';
import type { TheoremItem } from './Library';
import type { DefinitionItem } from './Definitions';

interface NewConjectureModalProps {
  onSave: (item: TheoremItem) => void;
  onCancel: () => void;
  definitions: DefinitionItem[];
}

export const NewConjectureModal = ({ onSave, onCancel, definitions }: NewConjectureModalProps) => {
  const [step, setStep] = useState<'name' | 'hypotheses' | 'hyp_lhs' | 'hyp_rhs' | 'lhs' | 'rhs' | 'review'>('name');
  const [name, setName] = useState('');
  const [hypotheses, setHypotheses] = useState<Equation[]>([]);
  
  // Temp state for building a hypothesis
  const [tempHypLhs, setTempHypLhs] = useState<Tree | null>(null);

  // Goal state
  const [lhs, setLhs] = useState<Tree | null>(null);
  const [rhs, setRhs] = useState<Tree | null>(null);

  // --- Handlers ---

  const handleHypLhsComplete = (t: Tree) => {
    setTempHypLhs(t);
    setStep('hyp_rhs');
  };

  const handleHypRhsComplete = (t: Tree) => {
    if (tempHypLhs) {
      setHypotheses([...hypotheses, { lhs: tempHypLhs, rhs: t }]);
      setTempHypLhs(null);
      setStep('hypotheses');
    }
  };

  const handleLhsComplete = (t: Tree) => {
    console.log('NewConjectureModal: LHS Complete', t);
    setLhs(t);
    setStep('rhs');
  };

  const handleRhsComplete = (t: Tree) => {
    console.log('NewConjectureModal: RHS Complete', t);
    setRhs(t);
    setStep('review');
  };

  const handleFinalize = () => {
    if (!lhs || !rhs || !name) return;
    const sequent = createSequent(lhs, rhs, hypotheses);
    const newItem: TheoremItem = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      sequent,
      proof: {}
    };
    onSave(newItem);
  };

  // --- Render Steps ---

  if (step === 'name') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded border border-gray-700 w-96">
          <h3 className="text-xl font-bold text-white mb-4">New Conjecture</h3>
          <input 
            className="w-full bg-black text-white p-2 rounded mb-4 border border-gray-700"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="text-gray-400 px-4 py-2">Cancel</button>
            <button 
              disabled={!name}
              onClick={() => setStep('hypotheses')} 
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'hypotheses') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded border border-gray-700 w-[600px]">
          <h3 className="text-xl font-bold text-white mb-4">Hypotheses (Assumptions)</h3>
          
          <div className="mb-4 max-h-60 overflow-y-auto bg-black/30 p-2 rounded border border-gray-800">
            {hypotheses.length === 0 ? (
              <div className="text-gray-500 italic p-4 text-center">No hypotheses added.</div>
            ) : (
              hypotheses.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800 p-2 mb-2 rounded">
                  <div className="flex items-center gap-2 scale-75 origin-left">
                    <TreeViewer tree={h.lhs} />
                    <span className="font-bold text-gray-400">=</span>
                    <TreeViewer tree={h.rhs} />
                  </div>
                  <button 
                    onClick={() => setHypotheses(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-400 px-2"
                  >
                    x
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between">
            <button 
              onClick={() => setStep('hyp_lhs')} 
              className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded font-bold text-sm"
            >
              + Add Hypothesis
            </button>
            <button 
              onClick={() => setStep('lhs')} 
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold"
            >
              Next: Define Goal
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'hyp_lhs') {
    return <FormulaBuilder key="hyp_lhs" onComplete={handleHypLhsComplete} onCancel={() => setStep('hypotheses')} definitions={definitions} title="Build Hypothesis (LHS)" />;
  }

  if (step === 'hyp_rhs') {
    return <FormulaBuilder key="hyp_rhs" onComplete={handleHypRhsComplete} onCancel={() => setStep('hypotheses')} definitions={definitions} title="Build Hypothesis (RHS)" />;
  }

  if (step === 'lhs') {
    return <FormulaBuilder key="lhs" onComplete={handleLhsComplete} onCancel={() => setStep('hypotheses')} definitions={definitions} title="Build Goal (LHS)" />;
  }

  if (step === 'rhs') {
    return <FormulaBuilder key="rhs" onComplete={handleRhsComplete} onCancel={() => setStep('lhs')} definitions={definitions} title="Build Goal (RHS)" />;
  }

  // Review Step
  if (step === 'review' && lhs && rhs) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded border border-gray-700 w-[600px]">
          <h3 className="text-xl font-bold text-white mb-4">Review Conjecture</h3>
          <div className="mb-4">
            <div className="text-gray-400 text-sm mb-1">Name</div>
            <div className="text-white font-bold">{name}</div>
          </div>
          
          {hypotheses.length > 0 && (
            <div className="mb-4">
              <div className="text-gray-400 text-sm mb-1">Hypotheses</div>
              <div className="flex flex-wrap gap-2">
                {hypotheses.map((h, i) => (
                  <div key={i} className="bg-gray-800 p-2 rounded scale-75 origin-left border border-gray-700">
                    <div className="flex items-center gap-2">
                      <TreeViewer tree={h.lhs} />
                      <span>=</span>
                      <TreeViewer tree={h.rhs} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-gray-400 text-sm mb-1">LHS</div>
              <div className="h-20 border border-gray-800 rounded bg-black/50 overflow-hidden relative">
                 <div className="absolute inset-0 flex justify-center items-center scale-75">
                   <TreeViewer tree={lhs} />
                 </div>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">RHS</div>
              <div className="h-20 border border-gray-800 rounded bg-black/50 overflow-hidden relative">
                 <div className="absolute inset-0 flex justify-center items-center scale-75">
                   <TreeViewer tree={rhs} />
                 </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="text-gray-400 px-4 py-2">Cancel</button>
            <button onClick={handleFinalize} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold">Create</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};