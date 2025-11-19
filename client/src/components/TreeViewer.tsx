import React, { useMemo } from 'react';
import { getLayout } from '../lib/layout';
import type { TreeNode, VisualTree } from '../lib/layout';

interface TreeViewerProps {
  tree: VisualTree;
  onNodeClick?: (node: TreeNode) => void;
  isNodeSelected?: (node: TreeNode) => boolean;
}

const Node = ({ node, onClick, isSelected }: { node: TreeNode; onClick?: (n: TreeNode) => void; isSelected?: boolean }) => {
  const data = node.data;
  const isLeafNode = data.type === 'Leaf';
  const isVarNode = data.type === 'Variable';
  const isDefNode = data.type === 'DefinitionRef';
  const isHole = data.type === 'Hole';
  
  return (
    <g 
      transform={`translate(${node.x},${node.y})`} 
      onClick={(e) => { e.stopPropagation(); onClick?.(node); }}
      className={`cursor-pointer transition-opacity ${isHole ? '' : 'hover:opacity-80'}`}
    >
      {isSelected && !isHole && (
        <circle r={20} fill="rgba(59, 130, 246, 0.3)" />
      )}
      
      {isLeafNode ? (
        <path 
          d="M 0 -15 L 12 10 L -12 10 Z" 
          fill="#4ade80" 
          stroke="#166534" 
          strokeWidth="2" 
        />
      ) : isVarNode ? (
        <g>
          <circle 
            r={15} 
            fill="#fbbf24" 
            stroke="#b45309" 
            strokeWidth="2" 
          />
          <text 
            y={5} 
            textAnchor="middle" 
            className="text-xs font-bold fill-black pointer-events-none select-none"
          >
            {(data as any).name}
          </text>
        </g>
      ) : isDefNode ? (
        <g>
          <rect 
            x={-15}
            y={-15}
            width={30}
            height={30}
            fill="#a78bfa" 
            stroke="#5b21b6" 
            strokeWidth="2" 
            rx={4}
          />
          <text 
            y={5} 
            textAnchor="middle" 
            className="text-xs font-bold fill-black pointer-events-none select-none"
          >
            {(data as any).name}
          </text>
        </g>
      ) : isHole ? (
        <g>
          <rect 
            x={-15}
            y={-15}
            width={30}
            height={30}
            fill={isSelected ? "rgba(59, 130, 246, 0.3)" : "transparent"} 
            stroke={isSelected ? "#3b82f6" : "#4b5563"} 
            strokeWidth="2" 
            strokeDasharray="4"
            rx={4}
          />
          <text 
            y={5} 
            textAnchor="middle" 
            className="text-xs font-bold fill-gray-500 pointer-events-none select-none"
          >
            ?
          </text>
        </g>
      ) : (
        <circle 
          r={6} 
          fill="#60a5fa" 
          stroke="#1e40af" 
          strokeWidth="2" 
        />
      )}
    </g>
  );
};

const Edge = ({ source, target }: { source: TreeNode; target: TreeNode }) => {
  return (
    <line 
      x1={source.x} 
      y1={source.y} 
      x2={target.x} 
      y2={target.y} 
      stroke="#9ca3af" 
      strokeWidth="2" 
    />
  );
};

export const TreeViewer: React.FC<TreeViewerProps> = ({ tree, onNodeClick, isNodeSelected }) => {
  const root = useMemo(() => getLayout(tree), [tree]);

  // Flatten for rendering
  const nodes: TreeNode[] = [];
  const edges: { source: TreeNode; target: TreeNode }[] = [];

  function traverse(node: TreeNode) {
    nodes.push(node);
    node.children.forEach(child => {
      edges.push({ source: node, target: child });
      traverse(child);
    });
  }
  traverse(root);

  const width = root.width;
  const height = (nodes.reduce((max, n) => Math.max(max, n.y), 0)) + 60;

  return (
    <div className="overflow-auto border border-gray-700 rounded-lg bg-gray-900 p-4 flex justify-center">
      <svg width={width + 100} height={height} viewBox={`-50 -20 ${width + 100} ${height}`}>
        <g>
          {edges.map((e, i) => (
            <Edge key={i} source={e.source} target={e.target} />
          ))}
          {nodes.map((n) => (
            <Node 
              key={n.id} 
              node={n} 
              onClick={onNodeClick} 
              isSelected={isNodeSelected ? isNodeSelected(n) : false}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};
