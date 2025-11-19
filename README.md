# TreeQ: Tree Calculus Proof Assistant

TreeQ is a web-based proof assistant for exploring and proving theorems in **Tree Calculus**, a minimal computational model discovered by Barry Jay. It provides an interactive environment for constructing formulas, defining terms, and building cyclic proofs using a sequent calculus approach.

## Overview

This tool implements the reduction rules of Tree Calculus and wraps them in a graphical interface that allows for:
*   **Formula Construction**: Building tree structures (Leaves, Applications, Variables) visually.
*   **Proof Management**: Managing conjectures, definitions, and theorems in a persistent local library.
*   **Interactive Proving**: Applying tactics such as Reduction, Symmetry, Transitivity, and Case Split to prove goals.
*   **Cyclic Proofs**: utilizing induction via cycle detection in the proof tree.

## Tree Calculus Rules

The core logic implements the following reduction rules, where `△` represents a Leaf and juxtaposition `x y` represents Application:

1.  `△ △ y z ⟶ y`
2.  `△ (△ x) y z ⟶ x z (y z)`
3.  `△ (△ w x) y △ ⟶ w`
4.  `△ (△ w x) y (△ u) ⟶ x u`
5.  `△ (△ w x) y (△ u v) ⟶ y u v`

These rules are based on the specification found at [treecalcul.us](https://treecalcul.us/specification/).

## Installation and Usage

TreeQ is a client-side Single Page Application (SPA) built with React and TypeScript.

### Prerequisites

*   Node.js (v18+)
*   npm

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/AHartNtkn/treeq.git
    cd treeq
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    cd client
    npm run dev
    ```

4.  Access the application in your browser at the URL provided (typically `http://localhost:5173`).

## Citations and Inspiration

This project is directly inspired by and based on the work of:

*   **Barry Jay**: For the discovery and development of *Tree Calculus* and *Pattern Calculus*.
    *   *The Tree Calculus* (Barry Jay)
    *   *Reflective Programs in Tree Calculus* (Barry Jay)
*   **CycleQ**: An efficient basis for cyclic equational reasoning, which inspired the proof structure.
*   **Treecalcul.us**: For the specific reduction rules specification used in this implementation.

## Architecture

The project is structured as a monorepo with a shared core library and a React frontend.

*   `shared/`: Contains the TypeScript implementation of the Tree Calculus data structures, reduction rules, and unification logic.
*   `client/`: Contains the React application, including the visual formula builder, proof state management, and library interface.