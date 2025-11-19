# TreeQ

TreeQ is a proof assistant for **Tree Calculus**. It implements the reduction rules defined by the specification and provides a graphical interface for constructing and proving theorems.

## Tree Calculus Implementation

The core reduction logic adheres to the rules specified at [treecalcul.us](https://treecalcul.us/specification/):

1.  `△ △ y z ⟶ y`
2.  `△ (△ x) y z ⟶ x z (y z)`
3.  `△ (△ w x) y △ ⟶ w`
4.  `△ (△ w x) y (△ u) ⟶ x u`
5.  `△ (△ w x) y (△ u v) ⟶ y u v`

(Where `△` denotes a Leaf node and juxtaposition denotes Application).

## Usage Guide

### Formula Construction
The **Formula Builder** allows the construction of trees by selecting node types:
*   **Leaf (△)**: The primitive value.
*   **App (@)**: Application of two trees.
*   **Variable**: A named placeholder.
*   **Definition**: A reference to a stored term.

### Proof Workspace
The workspace displays the current **Sequent** (Hypotheses and Goal).
*   **Tactics**:
    *   **Reduce LHS/RHS**: Applies the reduction rules to the goal.
    *   **Symmetry**: Swaps the left and right sides of the goal.
    *   **Transitivity**: Introduces an intermediate term.
    *   **Case Split**: Splits a variable into Leaf, Stem, and Fork cases.
    *   **Unfold Def**: Replaces a definition reference with its value.
    *   **Apply Theorem**: Uses a previously proven theorem.
*   **Induction**: The system detects cycles in the proof tree. If a subgoal matches an ancestor sequent, it can be closed via induction.

### Library Management
*   **Definitions**: Create and store named terms.
*   **Theorems**: Create conjectures (Goals with optional Hypotheses).
*   **Import/Export**: The library state is persisted in the browser's LocalStorage. Use the "Export" button to save the state to a JSON file, and "Import" to load it.

## Installation

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Start the client: `cd client && npm run dev`

## References

1.  **Jay, B.** *The Tree Calculus*.
2.  **Jay, B.** *Reflective Programs in Tree Calculus*.
3.  **Tree Calculus Specification**. Retrieved from https://treecalcul.us/specification/
4.  **CycleQ**: *An Efficient Basis for Cyclic Equational Reasoning*. (Provides the foundation for the cyclic proof structure used in this tool).
