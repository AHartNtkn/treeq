import type { Sequent } from '@treeq/shared';
import { SequentView } from './SequentView';

// We can reuse the shape, or define a new simple one.
// Let's keep it compatible with the "Record" idea but simpler.
export interface TheoremItem {
  id: string; // UUID or just random string
  name: string;
  sequent: Sequent; // Object, not string!
  proof: any; // Object, not string!
  status?: 'proven' | 'wip';
}

interface LibraryProps {
  theorems: TheoremItem[];
  onLoadTheorem: (sequent: Sequent, name: string, proof: any) => void;
}

export const Library = ({ theorems, onLoadTheorem }: LibraryProps) => {
  if (theorems.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        Library is empty. Import a JSON file to get started.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-green-400 mb-6">Theorem Library</h2>
      <div className="grid gap-4">
        {theorems.map(thm => {
          const isProven = thm.status === 'proven';
          const isWip = thm.status === 'wip';
          
          return (
            <div key={thm.id} className={`bg-gray-900 border ${isProven ? 'border-green-600' : isWip ? 'border-blue-600' : 'border-yellow-600'} p-4 rounded hover:opacity-90 transition-opacity`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">{thm.name}</h3>
                  {isProven ? (
                    <span className="px-2 py-1 rounded bg-green-900 text-green-300 text-xs font-bold border border-green-700">THEOREM</span>
                  ) : isWip ? (
                    <span className="px-2 py-1 rounded bg-blue-900 text-blue-300 text-xs font-bold border border-blue-700">IN PROGRESS</span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-yellow-900 text-yellow-300 text-xs font-bold border border-yellow-700">CONJECTURE</span>
                  )}
                </div>
                <button 
                  onClick={() => onLoadTheorem(thm.sequent, thm.name, thm.proof)}
                  className={`${isProven ? 'bg-gray-700' : 'bg-green-700 hover:bg-green-600'} px-4 py-2 rounded font-bold text-sm text-white`}
                >
                  {isProven ? 'View Proof' : isWip ? 'Resume Proof' : 'Prove'}
                </button>
              </div>
              <div className="scale-90 origin-top-left opacity-80">
                <SequentView sequent={thm.sequent} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
