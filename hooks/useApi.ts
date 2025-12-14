import { useMemo } from "react";
import {
  useQuery as rqUseQuery,
  useMutation as rqUseMutation,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { z, type ZodType } from "zod";

/* =========================================================
 * Types
 * ========================================================= */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryParams = Record<string, string | number | boolean | undefined>;

interface BaseRequestOptions {
  query?: QueryParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export type RequestOptions<Method extends HttpMethod, Body = unknown> = Method extends "GET"
  ? BaseRequestOptions
  : BaseRequestOptions & { body: Body };

export type ApiSuccess<T> = {
  ok: true;
  status: number;
  data: T;
};

export type ApiFailure = {
  ok: false;
  status: number;
  data: null;
  error: unknown;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type RestProcedureConfig<M extends HttpMethod, Body, Resp> = {
  path: string;
  method: M;
  responseSchema?: ZodType<Resp>;
  bodySchema?: M extends "GET" ? never : ZodType<Body>;
  baseOptions?: BaseRequestOptions;
  queryKey?: QueryKey | ((options?: RequestOptions<"GET">) => QueryKey);
};

type RestQueryProcedure<Resp> = {
  queryKey: QueryKey | ((options?: RequestOptions<"GET">) => QueryKey);
  useQuery: (
    options?: RequestOptions<"GET">,
    queryOptions?: Omit<UseQueryOptions<Resp, Error, Resp, QueryKey>, "queryKey" | "queryFn">,
    overrideQueryKey?: QueryKey
  ) => UseQueryResult<Resp, Error>;
  fetch: (options?: RequestOptions<"GET">) => Promise<ApiResponse<Resp>>;
  fetchOrThrow: (options?: RequestOptions<"GET">) => Promise<Resp>;
};

type RestMutationProcedure<Resp, Body> = {
  useMutation: (mutationOptions?: UseMutationOptions<Resp, Error, Body>) => UseMutationResult<Resp, Error, Body>;
  mutate: (body: Body) => Promise<Resp>;
};

/* =========================================================
 * Utils
 * ========================================================= */

function buildUrl(baseUrl: string, path: string, query?: QueryParams) {
  const url = new URL(path, baseUrl);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

/* =========================================================
 * Core request
 * ========================================================= */

async function request<T, Method extends HttpMethod, Body = unknown>(
  baseUrl: string,
  method: Method,
  path: string,
  options?: RequestOptions<Method, Body>,
  responseSchema?: ZodType<T>,
  bodySchema?: ZodType<Body>
): Promise<ApiResponse<T>> {
  const url = buildUrl(baseUrl, path, options?.query);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options?.headers,
  };

  const init: RequestInit = { method, headers, signal: options?.signal };

  if (method !== "GET" && options && "body" in options) {
    if (bodySchema) {
      bodySchema.parse(options.body);
    }

    headers["Content-Type"] ??= "application/json";
    init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, init);
    const isJson = res.headers.get("content-type")?.includes("application/json");

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: isJson ? await res.json() : await res.text(),
      };
    }

    const rawData = isJson ? await res.json() : null;

    const data = responseSchema ? responseSchema.parse(rawData) : (rawData as T);

    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (error) {
    // If aborted, surface a consistent shape
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        data: null,
        error: "aborted",
      };
    }

    return {
      ok: false,
      status: 0,
      data: null,
      error,
    };
  }
}

async function requestOrThrow<T, Method extends HttpMethod, Body = unknown>(
  baseUrl: string,
  method: Method,
  path: string,
  options?: RequestOptions<Method, Body>,
  responseSchema?: ZodType<T>,
  bodySchema?: ZodType<Body>
): Promise<T> {
  const res = await request<T, Method, Body>(baseUrl, method, path, options, responseSchema, bodySchema);

  if (!res.ok) {
    throw res.error ?? new Error(`Request failed (${res.status})`);
  }

  return res.data;
}

/* =========================================================
 * Public API Types
 * ========================================================= */

/* Commented out: Use procedure() pattern instead for better type safety and React Query integration */
/*
export interface ApiClient {
  get<T>(path: string, options?: RequestOptions<"GET">, schema?: ZodType<T>): Promise<ApiResponse<T>>;

  post<T, Body>(
    path: string,
    options: RequestOptions<"POST", Body>,
    schema?: ZodType<T>,
    bodySchema?: ZodType<Body>
  ): Promise<ApiResponse<T>>;

  put<T, Body>(
    path: string,
    options: RequestOptions<"PUT", Body>,
    schema?: ZodType<T>,
    bodySchema?: ZodType<Body>
  ): Promise<ApiResponse<T>>;

  patch<T, Body>(
    path: string,
    options: RequestOptions<"PATCH", Body>,
    schema?: ZodType<T>,
    bodySchema?: ZodType<Body>
  ): Promise<ApiResponse<T>>;

  delete<T>(path: string, options?: RequestOptions<"DELETE">, schema?: ZodType<T>): Promise<ApiResponse<T>>;
}
*/

export interface ApiClientRQHooks {
  useQuery<T>(
    queryKey: QueryKey,
    path: string,
    options?: RequestOptions<"GET">,
    queryOptions?: Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn">,
    schema?: ZodType<T>
  ): UseQueryResult<T, Error>;

  useMutation<T, Body>(
    method: Exclude<HttpMethod, "GET">,
    path: string,
    baseOptions?: BaseRequestOptions,
    schema?: ZodType<T>,
    bodySchema?: ZodType<Body>,
    mutationOptions?: UseMutationOptions<T, Error, Body>
  ): UseMutationResult<T, Error, Body>;

  procedure<M extends HttpMethod, Resp, Body = undefined>(
    config: RestProcedureConfig<M, Body, Resp>
  ): M extends "GET" ? RestQueryProcedure<Resp> : RestMutationProcedure<Resp, Body>;
}

export type UseApiReturn = ApiClientRQHooks;

/* =========================================================
 * useApi Hook (FIXED)
 * ========================================================= */

export function useApi(baseUrl: string): UseApiReturn {
  return useMemo(() => {
    return {
      /* Commented out: Use procedure() pattern instead for better type safety and React Query integration */
      /*
      get<T>(path: string, options?: RequestOptions<"GET">, schema?: ZodType<T>) {
        return request<T, "GET">(baseUrl, "GET", path, options, schema);
      },

      post<T, Body>(
        path: string,
        options: RequestOptions<"POST", Body>,
        schema?: ZodType<T>,
        bodySchema?: ZodType<Body>
      ) {
        return request<T, "POST", Body>(baseUrl, "POST", path, options, schema, bodySchema);
      },

      put<T, Body>(
        path: string,
        options: RequestOptions<"PUT", Body>,
        schema?: ZodType<T>,
        bodySchema?: ZodType<Body>
      ) {
        return request<T, "PUT", Body>(baseUrl, "PUT", path, options, schema, bodySchema);
      },

      patch<T, Body>(
        path: string,
        options: RequestOptions<"PATCH", Body>,
        schema?: ZodType<T>,
        bodySchema?: ZodType<Body>
      ) {
        return request<T, "PATCH", Body>(baseUrl, "PATCH", path, options, schema, bodySchema);
      },

      delete<T>(path: string, options?: RequestOptions<"DELETE">, schema?: ZodType<T>) {
        return request<T, "DELETE">(baseUrl, "DELETE", path, options, schema);
      },
      */

      /* React Query helpers */

      useQuery<T>(
        queryKey: QueryKey,
        path: string,
        options?: RequestOptions<"GET">,
        queryOptions?: Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn">,
        schema?: ZodType<T>
      ): UseQueryResult<T, Error> {
        return rqUseQuery<T, Error, T, QueryKey>({
          queryKey,
          queryFn: ({ signal }) => requestOrThrow<T, "GET">(baseUrl, "GET", path, { ...options, signal }, schema),
          ...queryOptions,
        });
      },

      useMutation<T, Body>(
        method: Exclude<HttpMethod, "GET">,
        path: string,
        baseOptions?: BaseRequestOptions,
        schema?: ZodType<T>,
        bodySchema?: ZodType<Body>,
        mutationOptions?: UseMutationOptions<T, Error, Body>
      ): UseMutationResult<T, Error, Body> {
        return rqUseMutation<T, Error, Body>({
          mutationFn: (body: Body) =>
            requestOrThrow<T, typeof method, Body>(
              baseUrl,
              method,
              path,
              { ...(baseOptions ?? {}), body } as RequestOptions<typeof method, Body>,
              schema,
              bodySchema
            ),
          ...mutationOptions,
        });
      },

      procedure<M extends HttpMethod, Resp, Body = undefined>(
        config: RestProcedureConfig<M, Body, Resp>
      ): M extends "GET" ? RestQueryProcedure<Resp> : RestMutationProcedure<Resp, Body> {
        const { method, path, responseSchema, bodySchema, baseOptions, queryKey } = config;

        // Helper to compute the final query key
        const computeQueryKey = (options?: RequestOptions<"GET">, override?: QueryKey): QueryKey => {
          if (override) return override;

          if (typeof queryKey === "function") return queryKey(options);

          if (queryKey) return queryKey;

          return [method, path];
        };

        if (method === "GET") {
          return {
            queryKey: queryKey ?? [method, path],
            useQuery: (
              options?: RequestOptions<"GET">,
              queryOptions?: Omit<UseQueryOptions<Resp, Error, Resp, QueryKey>, "queryKey" | "queryFn">,
              overrideQueryKey?: QueryKey
            ) => {
              const finalQueryKey = computeQueryKey(options, overrideQueryKey);

              return rqUseQuery<Resp, Error, Resp, QueryKey>({
                queryKey: finalQueryKey,
                queryFn: ({ signal }) =>
                  requestOrThrow<Resp, "GET">(
                    baseUrl,
                    "GET",
                    path,
                    { ...(baseOptions ?? {}), ...(options ?? {}), signal },
                    responseSchema as ZodType<Resp>
                  ),
                ...queryOptions,
              });
            },
            fetch: (options?: RequestOptions<"GET">) =>
              request<Resp, "GET">(
                baseUrl,
                "GET",
                path,
                { ...(baseOptions ?? {}), ...(options ?? {}) },
                responseSchema as ZodType<Resp>
              ),
            fetchOrThrow: (options?: RequestOptions<"GET">) =>
              requestOrThrow<Resp, "GET">(
                baseUrl,
                "GET",
                path,
                { ...(baseOptions ?? {}), ...(options ?? {}) },
                responseSchema as ZodType<Resp>
              ),
          } as M extends "GET" ? RestQueryProcedure<Resp> : never;
        }

        return {
          useMutation: (mutationOptions?: UseMutationOptions<Resp, Error, Body>) =>
            rqUseMutation<Resp, Error, Body>({
              mutationFn: (body: Body) =>
                requestOrThrow<Resp, typeof method, Body>(
                  baseUrl,
                  method,
                  path,
                  { ...(baseOptions ?? {}), body } as RequestOptions<typeof method, Body>,
                  responseSchema as ZodType<Resp>,
                  bodySchema as ZodType<Body>
                ),
              ...mutationOptions,
            }),
          mutate: (body: Body) =>
            requestOrThrow<Resp, typeof method, Body>(
              baseUrl,
              method,
              path,
              { ...(baseOptions ?? {}), body } as RequestOptions<typeof method, Body>,
              responseSchema as ZodType<Resp>,
              bodySchema as ZodType<Body>
            ),
        } as M extends "GET" ? never : RestMutationProcedure<Resp, Body>;
      },
    };
  }, [baseUrl]);
}
