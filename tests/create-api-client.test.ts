import { describe, expect, test, vi } from 'vitest';
import { createApiClient } from '../src/client/create-api-client.js';
import type { ApiRequestClient } from '../src/client/http-client.js';

describe('createApiClient', () => {
  test('привязывает client к вложенному дереву без вызова operations при создании', async () => {
    const client = { request: vi.fn() } satisfies ApiRequestClient;
    const operation = vi.fn((receivedClient: ApiRequestClient, id: string, enabled = false) => ({
      receivedClient,
      id,
      enabled,
    }));
    const tree = { pets: { get: operation }, empty: {} } as const;

    const api = createApiClient(client, tree);
    expect(operation).not.toHaveBeenCalled();
    expect(api).not.toBe(tree);
    expect(await api.pets.get('42', true)).toEqual({ receivedClient: client, id: '42', enabled: true });
    expect(operation).toHaveBeenCalledWith(client, '42', true);
  });

  test('сохраняет специальные строковые ключи и исключения operation', () => {
    const client = { request: vi.fn() } satisfies ApiRequestClient;
    const failure = new Error('operation failed');
    const tree = Object.fromEntries([
      ['default', (_client: ApiRequestClient) => 'ok'],
      ['delete', (_client: ApiRequestClient) => { throw failure; }],
      ['__proto__', (_client: ApiRequestClient, value: unknown) => value],
      ['данные', (_client: ApiRequestClient) => Promise.resolve('готово')],
    ]) as Record<string, (client: ApiRequestClient, ...args: any[]) => any>;
    const api = createApiClient(client, tree);

    expect(api.default?.()).toBe('ok');
    expect(() => api.delete?.()).toThrow(failure);
    expect(api.__proto__?.('value')).toBe('value');
    return expect(api.данные?.()).resolves.toBe('готово');
  });
});
