/**
 * The Cross-Origin-Embedder-Policy this app is served with.
 *
 * Two things must agree on this value or WebContainer silently fails to boot:
 *  - the COEP response header in next.config.ts
 *  - the `coep` option passed to WebContainer.boot()
 *
 * which is why it lives here and is imported by both.
 *
 * 'credentialless' loads cross-origin subresources without credentials, so they
 * do not each need a Cross-Origin-Resource-Policy header. 'require-corp' is
 * stricter: every subresource must carry CORP, including the ones loaded inside
 * the WebContainer runtime iframe, and a single missing header there stops the
 * iframe from ever completing its handshake.
 *
 * 'credentialless' is Chromium-only. Firefox and Safari ignore it, leaving the page
 * without cross-origin isolation entirely, so 'require-corp' is the value to use
 * when testing there.
 */
export const WEBCONTAINER_COEP = "require-corp";
