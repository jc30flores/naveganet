export interface AxiosRequestConfig {
  params?: Record<string, unknown>;
  responseType?: 'json' | 'blob' | 'text';
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
  url: string;
}

export class AxiosError<T = unknown> extends Error {
  config: AxiosRequestConfig;
  response?: AxiosResponse<T>;
  status?: number;
  isAxiosError: boolean;

  constructor(
    message: string,
    config: AxiosRequestConfig,
    status?: number,
    response?: AxiosResponse<T>,
  ) {
    super(message);
    this.name = 'AxiosError';
    this.config = config;
    this.status = status;
    this.response = response;
    this.isAxiosError = true;
    Object.setPrototypeOf(this, AxiosError.prototype);
  }
}

function buildUrl(url: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  const base =
    typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost';
  const target = new URL(url, base);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => target.searchParams.append(key, String(entry)));
      return;
    }
    target.searchParams.append(key, String(value));
  });
  return target.toString();
}

function normalizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

async function parseBody(response: Response, responseType?: string): Promise<unknown> {
  if (responseType === 'blob') {
    return await response.blob();
  }
  if (responseType === 'json') {
    return await response.json();
  }
  if (responseType === 'text') {
    return await response.text();
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  if (contentType.startsWith('text/')) {
    return await response.text();
  }
  return await response.blob();
}

async function get<T = unknown>(
  url: string,
  config: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
  const finalUrl = buildUrl(url, config.params);
  const response = await fetch(finalUrl, {
    method: 'GET',
    credentials: config.withCredentials ? 'include' : 'same-origin',
    headers: config.headers,
  });
  const data = (await parseBody(response, config.responseType)) as T;
  const headers = normalizeHeaders(response.headers);
  const axiosResponse: AxiosResponse<T> = {
    data,
    status: response.status,
    statusText: response.statusText,
    headers,
    config,
    url: finalUrl,
  };
  if (!response.ok) {
    throw new AxiosError(
      `Request failed with status code ${response.status}`,
      config,
      response.status,
      axiosResponse,
    );
  }
  return axiosResponse;
}

const axios = {
  get,
  isAxiosError(value: unknown): value is AxiosError {
    return (
      value instanceof AxiosError ||
      (typeof value === 'object' && value !== null && (value as { isAxiosError?: boolean }).isAxiosError === true)
    );
  },
};

export type { AxiosRequestConfig, AxiosResponse };
export default axios;
