/**
 * The home page and the flights page both load the airport catalogue purely to
 * decorate a search form. A production incident showed that letting that fetch
 * throw took down the whole route, so the tolerant wrapper is covered here.
 */
jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

import { apiFetchOrFallback } from '../api';

/** jsdom has no global Response, so stub the surface apiFetch actually reads. */
const reply = (status: number, body: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

describe('apiFetchOrFallback', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    // jsdom lacks AbortSignal.timeout; without it every call would fail inside
    // apiFetch's try block and the success case below would pass for the wrong
    // reason.
    if (typeof AbortSignal.timeout !== 'function') {
      AbortSignal.timeout = (() => new AbortController().signal) as typeof AbortSignal.timeout;
    }
  });

  it('returns the payload when the request succeeds', async () => {
    fetchMock.mockResolvedValue(reply(200, [{ code: 'BOM' }]));
    await expect(apiFetchOrFallback('/flights/airports', [], { auth: false })).resolves.toEqual([
      { code: 'BOM' },
    ]);
  });

  it('falls back when the API returns a server error', async () => {
    fetchMock.mockResolvedValue(reply(500, { message: 'A database error occurred.' }));
    await expect(apiFetchOrFallback('/flights/airports', [], { auth: false })).resolves.toEqual([]);
  });

  it('falls back when the API is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(apiFetchOrFallback('/flights/airports', [], { auth: false })).resolves.toEqual([]);
  });

  it('does not swallow failures for callers that need the data', async () => {
    fetchMock.mockResolvedValue(reply(500, {}));
    const { apiFetch } = await import('../api');
    await expect(apiFetch('/hotels/featured', { auth: false })).rejects.toThrow();
  });
});
