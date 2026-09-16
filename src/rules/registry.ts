import type { Rule } from '../types.js';

// REG001 deliberately deferred. registry, scopedRegistry and publishRegistry are
// observations only. Neither npmjs intent nor future CLI/workspace overrides can
// be inferred reliably from these inputs. See docs/verified-behavior.md.
export const registryRules: Rule[] = [];
