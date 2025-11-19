import React from 'react';
import type { Sequent, Equation } from '@treeq/shared';
import { TreeViewer } from './TreeViewer';

interface SequentViewProps {
  sequent: Sequent;
}

const EquationView = ({ eq }: { eq: Equation }) => {
  return (
    <div className="flex items-center gap-4 bg-gray-800/50 p-2 rounded border border-gray-700">
      <div className="flex-1">
        <div className="text-xs text-gray-500 text-center mb-1">LHS</div>
        <TreeViewer tree={eq.lhs} />
      </div>
      <div className="text-2xl font-bold text-gray-400">=</div>
      <div className="flex-1">
        <div className="text-xs text-gray-500 text-center mb-1">RHS</div>
        <TreeViewer tree={eq.rhs} />
      </div>
    </div>
  );
};

export const SequentView: React.FC<SequentViewProps> = ({ sequent }) => {
  return (
    <div className="flex flex-col items-center gap-4 p-4 border border-gray-600 rounded bg-gray-900 w-full">
      <div className="flex flex-wrap gap-4 justify-center w-full">
        {sequent.hypotheses.length === 0 ? (
          <div className="text-gray-500 italic">No hypotheses</div>
        ) : (
          sequent.hypotheses.map((hyp, i) => (
            <div key={i} className="scale-75 origin-top">
              <EquationView eq={hyp} />
            </div>
          ))
        )}
      </div>
      
      <div className="w-full h-1 bg-white my-2"></div>
      
      <div className="w-full">
        <div className="text-center font-bold text-green-400 mb-2">GOAL</div>
        <EquationView eq={sequent.goal} />
      </div>
    </div>
  );
};
