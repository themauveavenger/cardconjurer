/**
 * Card storage module.
 *
 * Provides a server-backed persistence interface for in-progress cards.
 * The public entry point is createCardStorage(options), which returns an
 * object with saveCard, listCards, and loadCard methods.
 */

function createCardStorage(options = {}) {
	const fetchFn = options.fetch || window.fetch.bind(window);
	const notifyFn = options.notify || (typeof notify === 'function' ? notify : () => {});
	const baseUrl = options.baseUrl || '/api/cards';

	function sanitizeKey(key) {
		if (typeof key !== 'string') {
			return 'untitled';
		}
		// Mirror the server-side sanitization so the client can predict filenames.
		let sanitized = decodeURIComponent(key);
		sanitized = sanitized.replace(/\.\.+|[/\\]/g, '_');
		sanitized = sanitized.replace(/[\x00-\x1f\x7f<>:\"|?*]/g, '_');
		sanitized = sanitized.trim();
		sanitized = sanitized.replace(/[ _]+/g, '_');
		return sanitized.slice(0, 120) || 'untitled';
	}

	function handleError(context, error) {
		const message = error && error.message ? error.message : String(error);
		notifyFn(`Card storage ${context} failed: ${message}`, 5);
		throw error;
	}

	async function saveCard(key, cardData) {
		const safeKey = sanitizeKey(key);
		try {
			const response = await fetchFn(baseUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: safeKey, data: cardData })
			});
			if (!response.ok) {
				const text = await response.text().catch(() => 'Unknown error');
				throw new Error(`${response.status}: ${text}`);
			}
			return await response.json();
		} catch (error) {
			return handleError('save', error);
		}
	}

	async function listCards() {
		try {
			const response = await fetchFn(baseUrl);
			if (!response.ok) {
				const text = await response.text().catch(() => 'Unknown error');
				throw new Error(`${response.status}: ${text}`);
			}
			return await response.json();
		} catch (error) {
			return handleError('list', error);
		}
	}

	async function loadCard(key) {
		const safeKey = sanitizeKey(key);
		try {
			const response = await fetchFn(`${baseUrl}/${encodeURIComponent(safeKey)}`);
			if (!response.ok) {
				const text = await response.text().catch(() => 'Unknown error');
				throw new Error(`${response.status}: ${text}`);
			}
			return await response.json();
		} catch (error) {
			return handleError('load', error);
		}
	}

	return { saveCard, listCards, loadCard };
}
