import type { Tree, App } from '@treeq/shared';

export type VisualTree = Tree | { type: 'Hole', id: string };

export interface TreeNode {
  x: number;
  y: number;
  data: VisualTree;
  id: string; // Path ID like "0", "0.L", "0.R"
  children: TreeNode[];
  width: number; // Subtree width
}

const NODE_SIZE = 40;
const X_GAP = 20;
const Y_GAP = 60;

export function layoutTree(tree: VisualTree, id = "root", depth = 0): TreeNode {
  if (tree.type === 'Leaf' || tree.type === 'Variable' || tree.type === 'DefinitionRef' || tree.type === 'Hole') {
    return {
      x: 0, 
      y: depth * Y_GAP, 
      data: tree, 
      id, 
      children: [],
      width: NODE_SIZE 
    };
  }

  const appNode = tree as App; // Cast is safe-ish if we handle all non-App cases above
  // If we added more types, we'd need better checks.
  // But VisualTree only adds Hole.
  
  const left = layoutTree(appNode.left as VisualTree, `${id}.L`, depth + 1);
  const right = layoutTree(appNode.right as VisualTree, `${id}.R`, depth + 1);

  const width = left.width + right.width + X_GAP;

  return {
    x: 0, 
    y: depth * Y_GAP,
    data: tree,
    id,
    children: [left, right],
    width
  };
}

export function assignCoordinates(node: TreeNode, xOffset: number): void {
  node.x = xOffset + node.width / 2;
  
  if (node.children.length === 2) {
    const [left, right] = node.children;
    assignCoordinates(left!, xOffset);
    assignCoordinates(right!, xOffset + left!.width + X_GAP);
    
    node.x = (left!.x + right!.x) / 2;
  }
}

export function getLayout(tree: VisualTree): TreeNode {
  const root = layoutTree(tree);
  assignCoordinates(root, 0);
  return root;
}
