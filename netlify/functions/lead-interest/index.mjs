/**
 * POST /api/lead-interest: the quote request button on the "not the right fit" pages.
 * The logic is in ../lead/interest.mjs, next to the modules it shares with /api/lead.
 *
 * Netlify matches a function with its own path before it looks at redirects, so config.path is what
 * serves /api/lead-interest. The rule of the same name in netlify.toml is only a fallback.
 */
import { createInterestHandler } from '../lead/interest.mjs';

export default createInterestHandler();

export const config = { path: '/api/lead-interest' };
