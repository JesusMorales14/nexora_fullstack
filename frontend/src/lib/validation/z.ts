import { z } from 'zod'

// Zod 4 speeds up object parsing by compiling validators with `new Function`. Our CSP forbids
// eval-like code (script-src 'self', no 'unsafe-eval'), and even Zod's own feature probe triggers a
// CSP violation report. Jitless mode uses the interpreter path: same results, no eval.
//
// Every schema imports `z` from here (enforced by ESLint), so the setting is always applied and Zod
// is only downloaded with the lazy chunks that need it, not with the initial bundle.
z.config({ jitless: true })

export { z }
