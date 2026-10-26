# Workspace Agent Specifications

## Project Context
- **Stack:** Modern web stack (adjust matching your framework: TypeScript, Next.js, Node.js).
- **Style Rules:** Strict functional programming, clean separation of concerns, mandatory type safety.

## Operational Execution Protocol
1. **Discovery Mode:** Every task must start by reading the existing architecture files using the `filesystem` tool. Do not guess file locations.
2. **Incremental Modifications:** Make structural edits in atomic steps. Run local tests or build utilities via terminal tools after *every* change to ensure zero compilation or logical regression.
3. **Error Remediation:** If a build command or test fails, stop updating unrelated files. Analyze the terminal stack trace and fix the failure context immediately before proceeding.
4. **Clean Code Delivery:** Output code with modular documentation comments. Do not modify existing, unimpacted functions in the module.

## Active Skills Applied Globally
- `tdd_loop`: Require active failing specs before making functional changes.
- `token_budget`: Only return target file diffs; skip verbal updates.
- `safety_gate`: Acknowledge data safety boundaries.
