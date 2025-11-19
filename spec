Project goal:

Create a proof assistant for cyclic proofs over the tree calculus.

Main sources of inspiration:
- Tree Calculus (By Barry Jay)
- CycleQ: an efficient basis for cyclic equational reasoning

The statements in the logic should be sequents involving equations between tree calculus expressions, possibly referencing free variables which are considered implicitly universally quantified. Proofs are a sequent calculus over such equations + cyclic proofs.

The proof assistant should be a game-like, highly interactive and should include features for
- Proving theorems in a highly interactive and visual/graphical way. Avoid pure, freeform text input, instead make the interface construct formulas and theorems.
- Intuitively visualizing and exploring proofs
- Creating and saving definitions
- Referencing these definitions later
- Saving theorems for later use
- referencing theorems for later proofs
- Building and managing a library of theorems and definitions
- Exploring all of these things through an intuitive, highly visual, and highly interactive interface

