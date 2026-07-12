/**
 * Card storage module.
 *
 * Provides a server-backed persistence interface for in-progress cards.
 * The public entry point is createCardStorage(options), which returns an
 * object with saveCard, listCards, loadCard, and sanitizeKey methods.
 *
 * Dependencies (fetch, notify) are injected via options so the module has no
 * implicit global assumptions; the creator wires real dependencies at the
 * single call site.
 */

function createCardStorage(options = {}) {
	const fetchFn = options.fetch || window.fetch.bind(window);
	const notifyFn = options.notify || (() => {});
	const baseUrl = options.baseUrl || '/api/cards';

	// Sanitize a card name into the canonical key used for both the duplicate
	// check (listCards returns these) and the on-disk filename. The client
	// receives raw text (e.g. from prompt()), so it must NOT URL-decode here —
	// a stray '%' would throw URIError. The server re-applies the same rules
	// (see launcher.sanitize_card_name) and is tolerant of already-clean input.
	function sanitizeKey(key) {
		if (typeof key !== 'string') {
			return 'untitled';
		}
		let sanitized = key;
		// Strip path traversal attempts and directory separators.
		sanitized = sanitized.replace(/\.\.+|[/\\]/g, '_');
		// Replace control characters and other filesystem-unfriendly characters.
		sanitized = sanitized.replace(/[\x00-\x1f\x7f<>:\"|?*]/g, '_');
		// Trim whitespace from ends.
		sanitized = sanitized.trim();
		// Collapse multiple underscores/spaces into single underscores.
		sanitized = sanitized.replace(/[ _]+/g, '_');
		// Truncate to avoid overly long filenames.
		return sanitized.slice(0, 120) || 'untitled';
	}

	function handleError(context, error) {
		const message = error && error.message ? error.message : String(error);
		notifyFn(`Card storage ${context} failed: ${message}`, 5);
		throw error;
	}

	async function assertOk(response) {
		if (!response.ok) {
			const text = await response.text().catch(() => 'Unknown error');
			throw new Error(`${response.status}: ${text}`);
		}
	}

	async function saveCard(key, cardData) {
		const safeKey = sanitizeKey(key);
		try {
			const response = await fetchFn(baseUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: safeKey, data: cardData })
			});
			await assertOk(response);
			return await response.json();
		} catch (error) {
			return handleError('save', error);
		}
	}

	async function listCards() {
		try {
			const response = await fetchFn(baseUrl);
			await assertOk(response);
			return await response.json();
		} catch (error) {
			return handleError('list', error);
		}
	}

	async function loadCard(key) {
		const safeKey = sanitizeKey(key);
		try {
			const response = await fetchFn(`${baseUrl}/${encodeURIComponent(safeKey)}`);
			await assertOk(response);
			return await response.json();
		} catch (error) {
			return handleError('load', error);
		}
	}

	return { saveCard, listCards, loadCard, sanitizeKey };
}
