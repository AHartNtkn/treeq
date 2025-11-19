import type { Sequent, ProofNode, RuleType } from '@treeq/shared';

export class ProofState {
  root: ProofNode;
  nodes: Map<string, ProofNode>; // Fast lookup

  constructor(initialSequent: Sequent) {
    const rootId = 'root';
    this.root = {
      id: rootId,
      sequent: initialSequent,
      rule: null,
      children: []
    };
    this.nodes = new Map();
    this.nodes.set(rootId, this.root);
  }

  static fromJSON(data: any): ProofState {
    // data is { root: ProofNode }
    // We need to reconstruct the ProofState and populate the nodes map
    // Note: We assume the stored proof has a root.
    // If data is empty object {}, we can't restore. Caller handles that.
    
    const state = new ProofState(data.root.sequent); // Dummy init
    state.root = data.root;
    state.nodes = new Map();
    
    // Traverse and index
    const traverse = (node: ProofNode) => {
      state.nodes.set(node.id, node);
      node.children.forEach(traverse);
    };
    traverse(state.root);
    
    return state;
  }

  getNode(id: string): ProofNode | undefined {
    return this.nodes.get(id);
  }

  applyRule(nodeId: string, rule: RuleType, subgoals: Sequent[], backLinkTo?: string) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.rule = rule;
    node.backLinkTo = backLinkTo;
    
    node.children = subgoals.map((sg, i) => {
      const childId = `${nodeId}.${i}`;
      const childNode: ProofNode = {
        id: childId,
        sequent: sg,
        rule: null,
        children: [],
        parentId: nodeId
      };
      this.nodes.set(childId, childNode);
      return childNode;
    });
  }

  // Check if all leaves are closed (proved)
  isComplete(): boolean {
    return this.checkComplete(this.root);
  }

  private checkComplete(node: ProofNode): boolean {
    // If it has a backlink, it's closed by induction
    if (node.backLinkTo) return true;

    // If it has a rule...
    if (node.rule) {
      // And all children are complete
      return node.children.every(c => this.checkComplete(c));
    }
    
    // If no rule, check if it's axiomatically true (e.g. reflexivity or hypothesis)
    // But usually we require an explicit "Reflexivity" rule application to close it.
    // So if no rule, it's open.
    return false;
  }
  
  findCycle(_sequent: Sequent): string | undefined {
    // DFS or BFS to find an ancestor with same sequent
    // Actually, we need to look at the path from root to current node? 
    // Or any proved node? CycleQ usually allows matching any *previous* node in the history branch.
    // For now, let's just search the whole tree for a matching *open* or *processing* node?
    // Strictly, cyclic proofs reference an *ancestor*.
    
    // We don't have easy parent traversal without storing it.
    // I added parentId to ProofNode interface in shared, let's use it.
    
    // But `findCycle` is usually called *before* we create the node, or on the node itself.
    // Let's assume we are at `node`.
    return undefined; // Implemented in the component logic usually
  }
}
