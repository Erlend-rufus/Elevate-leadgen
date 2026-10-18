// Local stand-in for @zapier/zapier-durable: runs steps in order, with retries, no journal.
export function defineDurable(name, fn) {
  return { name, run: fn };
}
