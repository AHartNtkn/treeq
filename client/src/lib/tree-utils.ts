import { app, isApp } from '@treeq/shared';
import type { Tree } from '@treeq/shared';

export function replaceNode(root: Tree, pathId: string, replacement: Tree): Tree {
  // pathId format: "root", "root.L", "root.L.R" ...
  // We strip "root" prefix.
  
  if (pathId === 'root') return replacement;
  
  const parts = pathId.replace('root', '').split('.').filter(p => p);
  
  const traverse = (t: Tree, path: string[]): Tree => {
    if (path.length === 0) return replacement;
    
    if (!isApp(t)) {
      throw new Error('Path mismatch: Expected App at ' + path.join('.'));
    }
    
    const [next, ...rest] = path;
    if (next === 'L') {
      return app(traverse(t.left, rest), t.right);
    } else if (next === 'R') {
      return app(t.left, traverse(t.right, rest));
    } else {
      throw new Error('Invalid path segment: ' + next);
    }
  };
  
  return traverse(root, parts);
}
