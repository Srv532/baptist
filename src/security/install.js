// Side-effect module: installs the Trusted Types default policy as soon as it
// is imported. Kept separate so `main.js` can import it first.
import { installDefaultPolicy } from './trustedTypes.js';

installDefaultPolicy(globalThis);
