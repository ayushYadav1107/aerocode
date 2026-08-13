"use client";
import { useState, useEffect, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';
import { WEBCONTAINER_COEP } from '@/features/webContainers/coep';

interface UseWebContainerReturn {
    serverUrl: string | null;
    isLoading: boolean;
    error: string | null;
    instance : WebContainer | null;
    writeFileSync : (path:string, content:string) => Promise<void>;
    destroy:()=>void;
}

// Only a single WebContainer can be booted per page, and booting is expensive, so
// the boot is cached and shared by React StrictMode's double-mount and by every
// remount of the playground page.
//
// The cache lives on globalThis rather than in module scope on purpose: HMR
// re-evaluates this module while @webcontainer/api keeps the instance it already
// booted, and a module-scoped cache would come back null and boot a second time,
// throwing "Only a single WebContainer instance can be booted".
const BOOT_CACHE_KEY = '__aerocode_webcontainer_boot__';

type BootCache = { promise: Promise<WebContainer> | null };

const bootCache: BootCache = ((globalThis as Record<string, unknown>)[BOOT_CACHE_KEY] ??=
    { promise: null }) as BootCache;

const BOOT_TIMEOUT_MS = 45_000;

const HEADLESS_URL = 'https://stackblitz.com/headless';

/**
 * boot() resolves only when the hidden stackblitz.com/headless iframe completes a
 * postMessage handshake, and it never rejects when that iframe is blocked. When the
 * boot timer fires, work out *which* way it failed so the error names a real cause
 * instead of listing possibilities.
 */
async function diagnoseBootFailure(): Promise<string> {
    console.error('WebContainer environment:', {
        href: window.location.href,
        origin: window.location.origin,
        isSecureContext: window.isSecureContext,
        crossOriginIsolated: window.crossOriginIsolated,
        embedded: window.self !== window.top,
        coep: WEBCONTAINER_COEP,
        userAgent: navigator.userAgent,
    });

    // WebContainer cannot boot inside an embedded frame: VS Code's Simple Browser,
    // an IDE preview pane, or any iframed host. It needs a top-level browser tab.
    if (window.self !== window.top) {
        return 'This page is running inside an iframe (a VS Code Simple Browser, IDE preview pane or similar). WebContainer only works in a top-level browser tab - open the app directly in Chrome or Edge.';
    }

    const iframes = document.querySelectorAll('iframe[src*="/headless"]');

    if (iframes.length === 0) {
        return 'The WebContainer runtime iframe was never added to the page. The boot call did not get that far.';
    }

    if (iframes.length > 1) {
        return `Found ${iframes.length} WebContainer runtime iframes on the page. Only the first one can complete its handshake - hard reload (Ctrl+Shift+R) to clear the extras left behind by hot reloading.`;
    }

    try {
        await fetch(HEADLESS_URL, { mode: 'no-cors', credentials: 'omit' });
    } catch {
        return `Cannot load ${HEADLESS_URL}. Either the network is blocking stackblitz.com (extension, firewall, proxy or DNS), or the response is missing the Cross-Origin-Resource-Policy header your app's require-corp policy needs.`;
    }

    return `${HEADLESS_URL} is reachable, but its runtime iframe never completed the handshake. Check the Network tab for that request and hard reload (Ctrl+Shift+R) to discard any container left over from a previous session.`;
}

async function bootWebContainer(): Promise<WebContainer> {
    // WebContainer needs COOP/COEP headers. Without them boot() can hang forever
    // instead of failing, which looks like a frozen loading screen. Checked here
    // rather than in the calling effect so the failure arrives as a rejection.
    if (!window.crossOriginIsolated) {
        throw new Error(
            'This page is not cross-origin isolated. WebContainer requires the ' +
            'Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp headers.'
        );
    }

    if (!bootCache.promise) {
        // The SDK only acts on 'init' and 'warning' messages and drops the rest, so
        // log everything the runtime frame sends. A refusal (unsupported browser,
        // blocked storage, auth) shows up here and nowhere else.
        window.addEventListener('message', (event) => {
            if (event.origin.includes('stackblitz.com')) {
                console.info('[webcontainer] message from runtime:', event.data);
            }
        });

        // `coep` is forwarded to the WebContainer runtime iframe so it is served
        // with headers compatible with ours. If the two disagree the browser
        // blocks the iframe and boot() hangs forever instead of rejecting.
        bootCache.promise = WebContainer.boot({ coep: WEBCONTAINER_COEP }).catch((error) => {
            // If a previous module evaluation already booted, adopt that instance
            // instead of dying: the container and its iframe are still alive.
            const existing = (WebContainer as unknown as { _instance?: WebContainer })._instance;
            if (existing) {
                return existing;
            }

            bootCache.promise = null; // allow a later retry
            throw error;
        });
    }
    return bootCache.promise;
}

export const useWebContainer = (): UseWebContainerReturn => {
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [instance, setInstance] = useState<WebContainer | null>(null);

    useEffect(() => {
        let mounted = true;
        let settled = false;

        // boot() resolves only once the hidden stackblitz.com/headless iframe posts
        // back. If that iframe is blocked it never rejects, so surface a hint on a
        // timer rather than racing - a slow boot that does arrive still works.
        const timer = setTimeout(async () => {
            if (!mounted || settled) return;

            const diagnosis = await diagnoseBootFailure();
            console.error('WebContainer boot timed out:', diagnosis);

            // The boot may still be in flight - if it lands later it clears this.
            if (mounted && !settled) {
                setError(`WebContainer did not boot within ${BOOT_TIMEOUT_MS / 1000}s. ${diagnosis}`);
                setIsLoading(false);
            }
        }, BOOT_TIMEOUT_MS);

        bootWebContainer().then(
            (webContainerInstance) => {
                settled = true;
                if (!mounted) return;
                setInstance(webContainerInstance);
                setError(null);
                setIsLoading(false);
            },
            (error) => {
                settled = true;
                console.error('Error initializing WebContainer:', error);
                if (!mounted) return;
                setError(error instanceof Error ? error.message : 'Failed to initialize WebContainer');
                setIsLoading(false);
            }
        );

        return () =>{
            mounted = false;
            clearTimeout(timer);
            // Deliberately no teardown here: the instance is shared across mounts and
            // tearing it down on unmount kills the running dev server on every remount.
        }
    },[])

    const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
        if(!instance){
            throw new Error('WebContainer instance is not available');
        }

        try{
            const pathParts = path.split('/');
            const folderPath = pathParts.slice(0, -1).join('/');

            if(folderPath){
                await instance.fs.mkdir(folderPath, { recursive: true });
            }

            await instance.fs.writeFile(path, content);
        } catch(error){
            const errorMessage = error instanceof Error ? error.message : 'Failed to write file';
            console.error(`Failed to write file at ${path}:`, error);
            throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
        }
    },[instance]);

    const destroy = useCallback(() => {
        if(instance){
            instance.teardown();
            bootCache.promise = null;
            setInstance(null);
            setServerUrl(null);
        }
    },[instance]);

    return {
        destroy,
        serverUrl,
        error,
        instance,
        isLoading,
        writeFileSync,
    }
};
