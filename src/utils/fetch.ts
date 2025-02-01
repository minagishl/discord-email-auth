// fetch with timer function
export const fetchWithTimeout = async (
	url: string,
	options: RequestInit & { timeout?: number } = {},
): Promise<Response> => {
	const { timeout = 5000, ...fetchOptions } = options;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...fetchOptions,
			signal: controller.signal,
		});
		return response;
	} finally {
		clearTimeout(timeoutId);
	}
};
