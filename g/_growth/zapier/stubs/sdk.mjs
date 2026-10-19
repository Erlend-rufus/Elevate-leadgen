// Local stand-in for @zapier/zapier-sdk: delegates to hooks the harness installs on globalThis.
export function createZapierSdk() {
  return {
    fetch: (url, init) => globalThis.__fake.fetch(url, init),
    runAction: (args) => globalThis.__fake.runAction(args),
  };
}
