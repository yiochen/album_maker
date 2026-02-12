/**
 * Service Worker Registration
 *
 * Registers the service worker on app startup and exposes a promise
 * that resolves once the SW is active and ready to intercept fetches.
 *
 * The SW handles:
 * - /__local__/dummyColors/* → on-the-fly SVG generation
 * - lh3.googleusercontent.com/* → cache-first for Google Photos images
 */

/** Registers the service worker. Call once at app startup. */
export function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service workers are not supported in this browser.');
        return;
    }

    navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
            console.log('Service worker registered:', registration.scope);
        })
        .catch((error) => {
            console.error('Service worker registration failed:', error);
        });
}

/**
 * Returns a promise that resolves when the service worker is active.
 * Useful for delaying operations that depend on SW interception
 * (e.g., loading dummy color images on first page load).
 */
export function waitForServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
        return Promise.reject(new Error('Service workers not supported'));
    }
    return navigator.serviceWorker.ready;
}
