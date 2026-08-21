Packaging release. No user-facing feature changes.

Release assets are now built in CI and carry GitHub artifact attestations, so anyone can cryptographically verify that `main.js`, `manifest.json` and `styles.css` were built from this repository:

```bash
gh attestation verify main.js --repo n23eos/obsidian-vault-sunburst
```
