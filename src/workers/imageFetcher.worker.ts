// Web Worker for background image fetching
// This runs in a separate thread to avoid blocking the main UI

interface FetchRequest {
    id: string;
    url: string;
    type: 'thumbnail' | 'full';
}

interface FetchResponse {
    id: string;
    success: boolean;
    blob?: Blob;
    error?: string;
}

// Handle incoming messages
self.onmessage = async (event: MessageEvent<FetchRequest | FetchRequest[]>) => {
    const requests = Array.isArray(event.data) ? event.data : [event.data];

    await Promise.all(requests.map(async (request) => {
        try {
            const response = await fetch(request.url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();

            const result: FetchResponse = {
                id: request.id,
                success: true,
                blob,
            };

            self.postMessage(result);
        } catch (error) {
            const result: FetchResponse = {
                id: request.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };

            self.postMessage(result);
        }
    }));
};

// Export type for TypeScript
export type { FetchRequest, FetchResponse };
