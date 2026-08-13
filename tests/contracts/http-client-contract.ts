import { describe, expect, test, vi } from 'vitest';

export type HttpClientContractModule = {
  ApiError: new (...args: any[]) => Error;
  ContentType: { Json: string };
  HttpClient: new (config?: Record<string, any>) => {
    abortRequest: (token: symbol | string | number) => void;
    request: (params: { path: string; [key: string]: any }) => Promise<any>;
  };
};

export function defineHttpClientContract(
  name: string,
  load: () => Promise<HttpClientContractModule>,
): void {
  describe(`HttpClient contract: ${name}`, () => {
    test('формирует URL, JSON body и response одинаково', async () => {
      const { ContentType, HttpClient } = await load();
      const calls: Array<{ input: unknown; init?: RequestInit }> = [];
      const client = new HttpClient({
        baseUrl: 'https://contract.test',
        customFetch: async (input: unknown, init?: RequestInit) => {
          calls.push({ input, init });
          return Response.json({ ok: true });
        },
      });
      await expect(client.request({
        path: '/resource', method: 'POST', query: { values: [1, undefined, 2], empty: [] },
        type: ContentType.Json, body: false, format: 'json',
      })).resolves.toEqual({ ok: true });
      expect(calls[0]?.input).toBe('https://contract.test/resource?values=1&values=2');
      expect(calls[0]?.init?.body).toBe('false');
      expect(new Headers(calls[0]?.init?.headers).get('content-type')).toBe('application/json');
    });

    test('выполняет onRequest, onError retry и onResponse в одинаковом порядке', async () => {
      const { ApiError, HttpClient } = await load();
      const events: string[] = [];
      let attempts = 0;
      const client = new HttpClient({
        customFetch: async () => {
          attempts += 1;
          events.push(`fetch:${attempts}`);
          return attempts === 1 ? Response.json({ error: true }, { status: 401 }) : Response.json({ ok: true });
        },
        onRequest: (request: Record<string, any>, context: { retryCount: number }) => {
          events.push(`request:${context.retryCount}`);
          return request;
        },
        onResponse: (response: any) => {
          events.push('response');
          return response;
        },
        onError: (error: unknown, context: { retryCount: number; retry: () => Promise<any> }) => {
          events.push(`error:${context.retryCount}`);
          if (error instanceof ApiError && context.retryCount === 0) return context.retry();
          throw error;
        },
      });
      await expect(client.request({ path: '/', method: 'GET', format: 'json' })).resolves.toEqual({ ok: true });
      expect(events).toEqual(['request:0', 'fetch:1', 'error:0', 'request:1', 'fetch:2', 'response']);
    });

    test('поддерживает falsy cancel token', async () => {
      const { HttpClient } = await load();
      let signal: AbortSignal | null | undefined;
      const client = new HttpClient({
        customFetch: (_input: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
          signal = init?.signal;
          signal?.addEventListener('abort', () => reject(signal?.reason), { once: true });
        }),
      });
      const request = client.request({ path: '/', method: 'GET', cancelToken: 0 });
      const rejection = expect(request).rejects.toBeInstanceOf(DOMException);
      await vi.waitFor(() => expect(signal).toBeInstanceOf(AbortSignal));
      client.abortRequest(0);
      await rejection;
    });
  });
}
