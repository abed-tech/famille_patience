/** Cache mémoire pour réponses API GET — chargement instantané */
const store = new Map();
const DEFAULT_TTL = 45_000;

export const apiCache = {
    get(key) {
        const entry = store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expires) {
            store.delete(key);
            return null;
        }
        return entry.data;
    },

    set(key, data, ttl = DEFAULT_TTL) {
        store.set(key, { data, expires: Date.now() + ttl });
    },

    invalidatePrefix(prefix) {
        for (const key of store.keys()) {
            if (key.startsWith(prefix)) store.delete(key);
        }
    },

    clear() {
        store.clear();
    },
};

/** Affiche le cache immédiatement puis rafraîchit en arrière-plan */
export async function staleWhileRevalidate(key, fetcher, onUpdate) {
    const cached = apiCache.get(key);
    if (cached) {
        onUpdate(cached, true);
        fetcher().then(fresh => {
            apiCache.set(key, fresh);
            onUpdate(fresh, false);
        }).catch(() => {});
        return cached;
    }
    const fresh = await fetcher();
    apiCache.set(key, fresh);
    onUpdate(fresh, false);
    return fresh;
}
