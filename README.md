# TreeQ: A Proof Assistant for Tree Calculus

TreeQ is an interactive, web-based proof assistant designed for exploring and proving theorems in **Tree Calculus**, a minimal and reflective computational model discovered by Barry Jay.

![TreeQ Screenshot](https://via.placeholder.com/800x450?text=TreeQ+Screenshot+Coming+Soon)

## 🌟 Features

*   **Visual Formula Builder**: Construct complex tree structures (Leaves, Applications, Variables) using an intuitive point-and-click interface.
*   **Interactive Proof Workspace**:
    *   **Goal-Oriented Proving**: Break down goals into subgoals using a sequent calculus approach.
    *   **Tactics**: Use built-in tactics like **Reduction**, **Symmetry**, **Transitivity**, and **Case Split**.
    *   **Induction**: Supports cyclic proofs (induction) by detecting matching ancestors in the proof tree.
*   **Definition Management**: Define reusable terms (like combinators `I`, `K`, `S`) and unfold them in your proofs.
*   **Library System**: Manage your theorems and conjectures.
    *   **Import/Export**: Save your library to a JSON file to persist your work or share it with others.
    *   **Persistence**: Your work is automatically saved to your browser's local storage.
*   **Correctness**: Implements the standard **Tree Calculus** reduction rules (Rules 1-5) as specified in the literature.

## 🌲 Tree Calculus Rules

TreeQ implements the following reduction rules (where `△` is a Leaf and `x y` is Application):

1.  `△ △ y z ⟶ y` (K-rule behavior)
2.  `△ (△ x) y z ⟶ x z (y z)` (S-like behavior)
3.  `△ (△ w x) y △ ⟶ w`
4.  `△ (△ w x) y (△ u) ⟶ x u`
5.  `△ (△ w x) y (△ u v) ⟶ y u v`

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **npm**

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/AHartNtkn/treeq.git
    cd treeq
    ```

2.  Install dependencies (from the root directory):
    ```bash
    npm install
    ```

### Running the App

1.  Start the development server:
    ```bash
    cd client
    npm run dev
    ```

2.  Open your browser and navigate to the URL shown (usually `http://localhost:5173`).

## 🛠️ Architecture

TreeQ is a **Client-Only** Single Page Application (SPA).

*   **Frontend**: React, Vite, Tailwind CSS.
*   **State**: Managed locally in memory and persisted to `localStorage`.
*   **Shared Logic**: The core Tree Calculus logic (types, reduction rules, unification) resides in a shared module used by the client.

## 📚 built-in Demo

The application comes with a pre-loaded library containing:
*   **Definitions**: `I`, `K`, `False`.
*   **Theorems**: Proofs for `K Reduction`, `False Reduction`, and `Identity`.

You can reset the library by clearing your browser's Local Storage for the site.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

## 📄 License

[MIT](LICENSE)
