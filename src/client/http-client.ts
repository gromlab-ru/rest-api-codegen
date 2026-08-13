export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, 'body' | 'bodyUsed'>;

export interface FullRequestParams extends Omit<RequestInit, 'body'> {
  secure?: boolean;
  path: string;
  type?: ContentType;
  query?: QueryParamsType;
  format?: ResponseFormat;
  body?: unknown;
  baseUrl?: string;
  cancelToken?: CancelToken;
  timeout?: number;
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;

export interface RequestContext<TResult = unknown> {
  url: string;
  request: FullRequestParams;
  retryCount: number;
  retry: () => Promise<TResult>;
}

export type RequestInterceptor = (
  params: FullRequestParams,
  context: RequestContext,
) => FullRequestParams | Promise<FullRequestParams>;

export type ResponseInterceptor = <D = unknown, E = unknown>(
  response: HttpResponse<D, E>,
  context: RequestContext,
) => HttpResponse<D, E> | Promise<HttpResponse<D, E>>;

export type ErrorInterceptor = <TResult = unknown>(
  error: unknown,
  context: RequestContext<TResult>,
) => TResult | Promise<TResult>;

export type ParamsSerializer = (query: QueryParamsType) => string;
export type ResponseParser = (response: Response, format?: ResponseFormat) => unknown | Promise<unknown>;
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ApiRequestClient {
  request<T = any, E = any>(params: FullRequestParams): Promise<T>;
}

export interface ApiConfig extends Omit<RequestParams, 'baseUrl' | 'cancelToken' | 'signal'> {
  baseUrl?: string;
  customFetch?: FetchLike;
  paramsSerializer?: ParamsSerializer;
  responseParser?: ResponseParser;
  onRequest?: RequestInterceptor;
  onResponse?: ResponseInterceptor;
  onError?: ErrorInterceptor;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}

export class ApiError<E = unknown> extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly response: Response;
  public readonly data: unknown;
  public readonly error: E;
  public readonly request: FullRequestParams;

  constructor(response: Response, request: FullRequestParams, data: unknown, error: E) {
    super(`Request failed with status ${response.status} ${response.statusText}`.trim());
    this.name = 'ApiError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.response = response;
    this.data = data;
    this.error = error;
    this.request = request;
  }
}

export type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = 'application/json',
  JsonApi = 'application/vnd.api+json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain',
}

export class HttpClient implements ApiRequestClient {
  public baseUrl = '';
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch: FetchLike = (...fetchParams) => fetch(...fetchParams);
  private paramsSerializer?: ParamsSerializer;
  private responseParser?: ResponseParser;
  private onRequest?: RequestInterceptor;
  private onResponse?: ResponseInterceptor;
  private onError?: ErrorInterceptor;

  private baseRequestParams: RequestParams = {
    credentials: 'same-origin',
    headers: {},
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
  };

  constructor({
    baseUrl,
    customFetch,
    paramsSerializer,
    responseParser,
    onRequest,
    onResponse,
    onError,
    ...baseRequestParams
  }: ApiConfig = {}) {
    if (typeof baseUrl === 'string') {
      this.baseUrl = baseUrl;
    }

    this.customFetch = customFetch || this.customFetch;
    this.paramsSerializer = paramsSerializer;
    this.responseParser = responseParser;
    this.onRequest = onRequest;
    this.onResponse = onResponse;
    this.onError = onError;
    this.baseRequestParams = this.mergeRequestParams(this.baseRequestParams, baseRequestParams);
  }

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === 'number' ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join('&');
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};

    if (this.paramsSerializer) {
      return this.paramsSerializer(query);
    }

    const keys = Object.keys(query).filter((key) => 'undefined' !== typeof query[key]);
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join('&');
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : '';
  }

  protected buildRequestUrl(baseUrl: string | undefined, path: string, query?: QueryParamsType): string {
    return `${baseUrl || this.baseUrl || ''}${path}${this.addQueryParams(query)}`;
  }

  protected createRequestContext<TResult>(
    request: FullRequestParams,
    retryCount: number,
    retry: () => Promise<TResult>,
  ): RequestContext<TResult> {
    return {
      url: this.buildRequestUrl(request.baseUrl, request.path, request.query),
      request,
      retryCount,
      retry,
    };
  }

  protected updateRequestContext<TResult>(context: RequestContext<TResult>, request: FullRequestParams) {
    context.request = request;
    context.url = this.buildRequestUrl(request.baseUrl, request.path, request.query);
  }

  protected mergeHeaders(...headers: Array<HeadersInit | undefined>): HeadersInit {
    const mergedHeaders = new Headers();

    headers.forEach((headers) => {
      if (!headers) {
        return;
      }

      new Headers(headers).forEach((value, key) => mergedHeaders.set(key, value));
    });

    return Object.fromEntries(mergedHeaders.entries());
  }

  protected mergeRequestParams<T extends Partial<FullRequestParams>>(
    params1: T,
    params2?: Partial<FullRequestParams>,
  ): T {
    return {
      ...params1,
      ...(params2 || {}),
      headers: this.mergeHeaders(params1.headers, params2?.headers),
    } as T;
  }

  protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  protected createRequestSignal = (
    signal?: AbortSignal | null,
    cancelToken?: CancelToken,
    timeout?: number,
  ): { signal: AbortSignal | null; cleanup: () => void } => {
    const signals: AbortSignal[] = [];
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (signal) {
      signals.push(signal);
    }

    if (typeof cancelToken !== 'undefined') {
      const cancelSignal = this.createAbortSignal(cancelToken);

      if (cancelSignal) {
        signals.push(cancelSignal);
      }
    }

    if (typeof timeout === 'number' && timeout > 0) {
      const timeoutController = new AbortController();
      timeoutId = setTimeout(() => timeoutController.abort(), timeout);
      signals.push(timeoutController.signal);
    }

    const cleanupTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    if (signals.length === 0) {
      return { signal: null, cleanup: cleanupTimeout };
    }

    if (signals.length === 1) {
      return { signal: signals[0] || null, cleanup: cleanupTimeout };
    }

    const abortController = new AbortController();
    const abortRequest = () => abortController.abort();

    signals.forEach((signal) => {
      if (signal.aborted) {
        abortController.abort();
      } else {
        signal.addEventListener('abort', abortRequest, { once: true });
      }
    });

    return {
      signal: abortController.signal,
      cleanup: () => {
        cleanupTimeout();
        signals.forEach((signal) => signal.removeEventListener('abort', abortRequest));
      },
    };
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === 'object' || typeof input === 'string') ? JSON.stringify(input) : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === 'object' || typeof input === 'string') ? JSON.stringify(input) : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== 'string' ? JSON.stringify(input) : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === 'object' && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected parseResponse = async <T = any, E = any>(
    response: Response,
    responseFormat?: ResponseFormat,
  ): Promise<HttpResponse<T, E>> => {
    const parsedResponse = response as HttpResponse<T, E>;
    parsedResponse.data = null as unknown as T;
    parsedResponse.error = null as unknown as E;

    if (!responseFormat && !this.responseParser) {
      return parsedResponse;
    }

    const responseToParse = response.clone();

    await Promise.resolve(
      this.responseParser
        ? this.responseParser(responseToParse, responseFormat)
        : responseToParse[responseFormat as ResponseFormat](),
    )
      .then((data) => {
        if (parsedResponse.ok) {
          parsedResponse.data = data as T;
        } else {
          parsedResponse.error = data as E;
        }
      })
      .catch((error) => {
        if (parsedResponse.ok) {
          throw error;
        }

        parsedResponse.error = error as E;
      });

    return parsedResponse;
  };

  public request = async <T = any, E = any>(requestParams: FullRequestParams): Promise<T> => {
    return this.requestWithRetry<T, E>(requestParams, 0);
  };

  private requestWithRetry = async <T = any, E = any>(
    requestParams: FullRequestParams,
    retryCount: number,
  ): Promise<T> => {
    let request = this.mergeRequestParams(this.baseRequestParams, requestParams) as FullRequestParams;
    request.baseUrl = request.baseUrl || this.baseUrl;
    request.secure = typeof request.secure === 'boolean' ? request.secure : this.baseRequestParams.secure;

    const context = this.createRequestContext<T>(
      request,
      retryCount,
      () => this.requestWithRetry<T, E>(requestParams, retryCount + 1),
    );

    let cleanupSignal = () => {};
    let cancelToken: CancelToken | undefined;

    const cleanupRequest = () => {
      cleanupSignal();
      if (typeof cancelToken !== 'undefined') {
        this.abortControllers.delete(cancelToken);
      }
    };

    try {
      if (this.onRequest) {
        request = await this.onRequest(request, context);
        this.updateRequestContext(context, request);
      }

      const {
        body,
        secure,
        path,
        type,
        query,
        format,
        baseUrl,
        cancelToken: requestCancelToken,
        timeout,
        ...params
      } = request;

      cancelToken = requestCancelToken;
      const { signal, cleanup } = this.createRequestSignal(params.signal, cancelToken, timeout);
      cleanupSignal = cleanup;

      const payloadFormatter = this.contentFormatters[type || ContentType.Json];
      const response = await this.customFetch(context.url, {
        ...params,
        headers: this.mergeHeaders(
          params.headers,
          type && type !== ContentType.FormData ? { 'Content-Type': type } : undefined,
        ),
        signal,
        body: typeof body === 'undefined' || body === null ? null : payloadFormatter(body),
      });

      const parsedResponse = await this.parseResponse<T, E>(response, format);

      if (!parsedResponse.ok) {
        throw new ApiError<E>(parsedResponse, request, parsedResponse.error || parsedResponse.data, parsedResponse.error);
      }

      const finalResponse = this.onResponse
        ? await this.onResponse<T, E>(parsedResponse, context)
        : parsedResponse;

      return finalResponse.data;
    } catch (error) {
      cleanupRequest();

      if (this.onError) {
        return this.onError(error, context);
      }

      throw error;
    } finally {
      cleanupRequest();
    }
  };
}
