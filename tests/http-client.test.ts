import { describe, expect, test, vi } from 'vitest';
import {
  ApiError,
  ContentType,
  HttpClient,
  type FetchLike,
  type FullRequestParams,
} from '../src/client/http-client.js';

type CapturedRequest = { input: RequestInfo | URL; init?: RequestInit };

function createFetch(response: Response = Response.json({ ok: true })) {
  const requests: CapturedRequest[] = [];
  const fetch: FetchLike = async (input, init) => {
    requests.push({ input, init });
    return response;
  };
  return { fetch, requests };
}

function pendingFetch() {
  const signals: AbortSignal[] = [];
  const fetch: FetchLike = (_input, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) {
      reject(new Error('Expected AbortSignal'));
      return;
    }
    signals.push(signal);
    const rejectAbort = () => reject(signal.reason);
    if (signal.aborted) {
      rejectAbort();
    } else {
      signal.addEventListener('abort', rejectAbort, { once: true });
    }
  });
  return { fetch, signals };
}

describe('HttpClient URL и request params', () => {
  test('сериализует scalar и array query без пустых сегментов и сохраняет fragment', async () => {
    const captured = createFetch();
    const client = new HttpClient({ baseUrl: 'https://api.example', customFetch: captured.fetch });

    await client.request({
      path: '/pets?fixed=1#section',
      method: 'GET',
      query: { q: 'тест', ids: [1, undefined, 2], empty: [], omitted: undefined, zero: 0, no: false },
      format: 'json',
    });

    expect(captured.requests[0]?.input).toBe(
      'https://api.example/pets?fixed=1&q=%D1%82%D0%B5%D1%81%D1%82&ids=1&ids=2&zero=0&no=false#section',
    );
  });

  test('поддерживает явный пустой request baseUrl и custom serializer', async () => {
    const captured = createFetch();
    const serializer = vi.fn(() => 'custom=1');
    const client = new HttpClient({ baseUrl: 'https://api.example', customFetch: captured.fetch, paramsSerializer: serializer });
    const query = { raw: ['a', 'b'] };

    await client.request({ path: '/relative', method: 'GET', baseUrl: '', query });

    expect(captured.requests[0]?.input).toBe('/relative?custom=1');
    expect(serializer).toHaveBeenCalledWith(query);
  });

  test.each(['/path?fixed=1', '/path?', '/path?fixed=1&'])('добавляет query к существующему separator: %s', async (path) => {
    const captured = createFetch();
    const client = new HttpClient({ customFetch: captured.fetch });
    await client.request({ path, method: 'GET', query: { next: 2 } });
    expect(String(captured.requests[0]?.input)).toMatch(/next=2$/);
    expect(String(captured.requests[0]?.input)).not.toContain('??');
  });

  test('ошибка serializer попадает в onError до fetch', async () => {
    const fallback = { recovered: true };
    const customFetch = vi.fn<FetchLike>();
    const client = new HttpClient({
      customFetch,
      paramsSerializer: () => { throw new Error('serializer failed'); },
      onError: () => fallback,
    });
    await expect(client.request({ path: '/', method: 'GET', query: { q: 1 } })).resolves.toBe(fallback);
    expect(customFetch).not.toHaveBeenCalled();
  });

  test('не передаёт transport-only поля в fetch и объединяет headers без учёта регистра', async () => {
    const captured = createFetch();
    const client = new HttpClient({
      customFetch: captured.fetch,
      headers: { Authorization: 'base', 'X-Base': '1' },
      credentials: 'include',
    });

    await client.request({
      path: '/pets',
      method: 'POST',
      secure: true,
      format: 'json',
      timeout: 100,
      headers: { authorization: 'request', 'X-Request': '2' },
      body: { name: 'Rex' },
    });

    const init = captured.requests[0]?.init as RequestInit & Record<string, unknown>;
    expect(init.credentials).toBe('include');
    expect(init.headers).toEqual({
      authorization: 'request',
      'content-type': ContentType.Json,
      'x-base': '1',
      'x-request': '2',
    });
    expect(init.body).toBe('{"name":"Rex"}');
    for (const key of ['path', 'secure', 'query', 'format', 'timeout', 'baseUrl', 'cancelToken', 'type']) {
      expect(init).not.toHaveProperty(key);
    }
  });
});

describe('HttpClient body formats', () => {
  test.each([
    [ContentType.Json, false, 'false'],
    [ContentType.JsonApi, 0, '0'],
    [ContentType.Text, { value: 1 }, '{"value":1}'],
    [ContentType.UrlEncoded, { name: 'A B', enabled: false }, 'name=A%20B&enabled=false'],
  ])('форматирует %s', async (type, body, expectedBody) => {
    const captured = createFetch();
    const client = new HttpClient({ customFetch: captured.fetch });
    await client.request({ path: '/', method: 'POST', type, body });
    expect(captured.requests[0]?.init?.body).toBe(expectedBody);
  });

  test('не оставляет ручной Content-Type у FormData, чтобы runtime добавил boundary', async () => {
    const captured = createFetch();
    const client = new HttpClient({ customFetch: captured.fetch, headers: { 'Content-Type': 'application/json' } });
    const formData = new FormData();
    formData.append('file', new Blob(['content']), 'file.txt');

    await client.request({ path: '/', method: 'POST', type: ContentType.FormData, body: formData });

    expect(captured.requests[0]?.init?.body).toBe(formData);
    expect(captured.requests[0]?.init?.headers).toEqual({});
  });

  test('строит FormData из object, Blob, falsy и nested values', async () => {
    const captured = createFetch();
    const client = new HttpClient({ customFetch: captured.fetch });
    const blob = new Blob(['file']);
    await client.request({
      path: '/', method: 'POST', type: ContentType.FormData,
      body: { blob, zero: 0, no: false, empty: '', nested: { value: 1 }, nil: null },
    });
    const form = captured.requests[0]?.init?.body as FormData;
    const storedBlob = form.get('blob');
    expect(storedBlob).toBeInstanceOf(Blob);
    await expect((storedBlob as Blob).text()).resolves.toBe('file');
    expect(form.get('zero')).toBe('0');
    expect(form.get('no')).toBe('false');
    expect(form.get('empty')).toBe('');
    expect(form.get('nested')).toBe('{"value":1}');
    expect(form.get('nil')).toBe('null');
  });

  test('без явного type сериализует body как JSON и добавляет Content-Type', async () => {
    const captured = createFetch();
    const client = new HttpClient({ customFetch: captured.fetch });
    await client.request({ path: '/', method: 'POST', body: [1, 2] });
    expect(captured.requests[0]?.init?.body).toBe('[1,2]');
    expect(captured.requests[0]?.init?.headers).toEqual({ 'content-type': ContentType.Json });
  });
});

describe('HttpClient responses и interceptors', () => {
  test('без format и parser возвращает null, не читая body', async () => {
    const response = new Response('raw');
    const client = new HttpClient({ customFetch: async () => response });
    await expect(client.request({ path: '/', method: 'GET' })).resolves.toBeNull();
    await expect(response.text()).resolves.toBe('raw');
  });

  test('custom parser получает clone и полностью заменяет встроенный parser', async () => {
    const response = Response.json({ original: true });
    const parser = vi.fn(async (received: Response, format) => ({ format, text: await received.text() }));
    const client = new HttpClient({ customFetch: async () => response, responseParser: parser });
    await expect(client.request({ path: '/', method: 'GET', format: 'json' })).resolves.toEqual({
      format: 'json', text: '{"original":true}',
    });
    expect(parser).toHaveBeenCalledOnce();
    await expect(response.text()).resolves.toBe('{"original":true}');
  });
  test('парсит success и вызывает onResponse после parsing', async () => {
    const onResponse = vi.fn((response) => {
      response.data = { changed: true };
      return response;
    });
    const client = new HttpClient({ customFetch: async () => Response.json({ original: true }), onResponse });

    await expect(client.request({ path: '/', method: 'GET', format: 'json' })).resolves.toEqual({ changed: true });
    expect(onResponse).toHaveBeenCalledOnce();
  });

  test.each([false, 0, '', null])('сохраняет falsy error payload %j в ApiError', async (payload) => {
    const client = new HttpClient({
      customFetch: async () => new Response(JSON.stringify(payload), { status: 400, headers: { 'content-type': 'application/json' } }),
    });

    const error = await client.request({ path: '/', method: 'GET', format: 'json' }).catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.error).toBe(payload);
    expect(error.data).toBe(payload);
    expect(error.status).toBe(400);
  });

  test('одинаково направляет sync и async parser errors в onError', async () => {
    const syncError = new Error('sync parser');
    const asyncError = new Error('async parser');
    const onError = vi.fn((error) => error === syncError ? 'sync fallback' : 'async fallback');
    const syncClient = new HttpClient({ customFetch: async () => new Response('ok'), responseParser: () => { throw syncError; }, onError });
    const asyncClient = new HttpClient({ customFetch: async () => new Response('ok'), responseParser: () => Promise.reject(asyncError), onError });

    await expect(syncClient.request({ path: '/', method: 'GET' })).resolves.toBe('sync fallback');
    await expect(asyncClient.request({ path: '/', method: 'GET' })).resolves.toBe('async fallback');
    expect(onError).toHaveBeenCalledTimes(2);
  });

  test('JWT interceptor и bounded retry используют новый token', async () => {
    let token = 'expired';
    const authorization: string[] = [];
    const onRequest = vi.fn((request: FullRequestParams) => ({
      ...request,
      headers: { ...Object.fromEntries(new Headers(request.headers).entries()), Authorization: `Bearer ${token}` },
    }));
    const customFetch: FetchLike = async (_input, init) => {
      authorization.push(new Headers(init?.headers).get('authorization') || '');
      return authorization.length === 1
        ? Response.json({ message: 'expired' }, { status: 401 })
        : Response.json({ ok: true });
    };
    const client = new HttpClient({
      customFetch,
      onRequest,
      onError: async (error, context) => {
        if (error instanceof ApiError && error.status === 401 && context.retryCount === 0) {
          token = 'fresh';
          return context.retry();
        }
        throw error;
      },
    });

    await expect(client.request({ path: '/', method: 'GET', secure: true, format: 'json' })).resolves.toEqual({ ok: true });
    expect(authorization).toEqual(['Bearer expired', 'Bearer fresh']);
    expect(onRequest).toHaveBeenCalledTimes(2);
  });

  test('cookie credentials передаются и сохраняются при retry', async () => {
    const credentials: Array<RequestCredentials | undefined> = [];
    const client = new HttpClient({
      credentials: 'include',
      customFetch: async (_input, init) => {
        credentials.push(init?.credentials);
        return credentials.length === 1 ? new Response('fail', { status: 503 }) : new Response(null, { status: 204 });
      },
      onError: (error, context) => context.retryCount === 0 ? context.retry() : Promise.reject(error),
    });

    await expect(client.request({ path: '/', method: 'GET' })).resolves.toBeNull();
    expect(credentials).toEqual(['include', 'include']);
  });

  test('default global fetch используется при отсутствии customFetch', async () => {
    const globalFetch = vi.fn(async () => Response.json({ global: true }));
    vi.stubGlobal('fetch', globalFetch);
    try {
      const client = new HttpClient();
      await expect(client.request({ path: 'https://example.test', method: 'GET', format: 'json' })).resolves.toEqual({ global: true });
      expect(globalFetch).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('HttpClient cancellation', () => {
  test.each([0, '', Symbol('request')])('отменяет запрос token %s', async (cancelToken) => {
    const pending = pendingFetch();
    const client = new HttpClient({ customFetch: pending.fetch });
    const request = client.request({ path: '/', method: 'GET', cancelToken });
    const rejection = expect(request).rejects.toBeInstanceOf(DOMException);
    await vi.waitFor(() => expect(pending.signals).toHaveLength(1));
    client.abortRequest(cancelToken);
    await rejection;
    expect(pending.signals[0]?.aborted).toBe(true);
  });

  test('один token отменяет все конкурентные активные запросы', async () => {
    const pending = pendingFetch();
    const client = new HttpClient({ customFetch: pending.fetch });
    const first = client.request({ path: '/first', method: 'GET', cancelToken: 'shared' });
    const second = client.request({ path: '/second', method: 'GET', cancelToken: 'shared' });
    const settled = Promise.allSettled([first, second]);
    await vi.waitFor(() => expect(pending.signals).toHaveLength(2));
    client.abortRequest('shared');
    await expect(settled).resolves.toEqual([
      expect.objectContaining({ status: 'rejected' }),
      expect.objectContaining({ status: 'rejected' }),
    ]);
  });

  test('композиция signal сохраняет custom abort reason', async () => {
    const pending = pendingFetch();
    const client = new HttpClient({ customFetch: pending.fetch });
    const controller = new AbortController();
    const reason = new Error('manual stop');
    const request = client.request({ path: '/', method: 'GET', signal: controller.signal, timeout: 10_000 });
    const rejection = expect(request).rejects.toBe(reason);
    await vi.waitFor(() => expect(pending.signals).toHaveLength(1));
    controller.abort(reason);
    await rejection;
  });

  test('pre-aborted signal немедленно отменяет composed request', async () => {
    const pending = pendingFetch();
    const client = new HttpClient({ customFetch: pending.fetch });
    const controller = new AbortController();
    const reason = new Error('already stopped');
    controller.abort(reason);
    await expect(client.request({ path: '/', method: 'GET', signal: controller.signal, timeout: 10 })).rejects.toBe(reason);
  });

  test('успешный запрос освобождает token для повторного использования', async () => {
    const captured = createFetch();
    const client = new HttpClient({ customFetch: captured.fetch });
    await client.request({ path: '/first', method: 'GET', cancelToken: 'reusable' });
    client.abortRequest('reusable');

    const pending = pendingFetch();
    const secondClient = new HttpClient({ customFetch: pending.fetch });
    const request = secondClient.request({ path: '/second', method: 'GET', cancelToken: 'reusable' });
    const rejection = expect(request).rejects.toBeInstanceOf(DOMException);
    await vi.waitFor(() => expect(pending.signals).toHaveLength(1));
    secondClient.abortRequest('reusable');
    await rejection;
  });

  test('abort неизвестного token является no-op', () => {
    expect(() => new HttpClient().abortRequest('unknown')).not.toThrow();
  });

  test('timeout aborts pending fetch', async () => {
    vi.useFakeTimers();
    const pending = pendingFetch();
    const client = new HttpClient({ customFetch: pending.fetch });
    const request = client.request({ path: '/', method: 'GET', timeout: 25 });
    const rejection = expect(request).rejects.toBeInstanceOf(DOMException);
    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    vi.useRealTimers();
  });
});
