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
import { z, type ZodSchema } from "zod";

/* =========================================================
 * Types
 * ========================================================= */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryParams = Record<string, string | number | boolean | undefined>;

interface BaseRequestOptions {
  query?: QueryParams;
  headers?: Record<string, string>;
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
  responseSchema?: ZodSchema<T>,
  bodySchema?: ZodSchema<Body>
): Promise<ApiResponse<T>> {
  const url = buildUrl(baseUrl, path, options?.query);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options?.headers,
  };

  const init: RequestInit = { method, headers };

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
  responseSchema?: ZodSchema<T>,
  bodySchema?: ZodSchema<Body>
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

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions<"GET">, schema?: ZodSchema<T>): Promise<ApiResponse<T>>;

  post<T, Body>(
    path: string,
    options: RequestOptions<"POST", Body>,
    schema?: ZodSchema<T>,
    bodySchema?: ZodSchema<Body>
  ): Promise<ApiResponse<T>>;

  put<T, Body>(
    path: string,
    options: RequestOptions<"PUT", Body>,
    schema?: ZodSchema<T>,
    bodySchema?: ZodSchema<Body>
  ): Promise<ApiResponse<T>>;

  patch<T, Body>(
    path: string,
    options: RequestOptions<"PATCH", Body>,
    schema?: ZodSchema<T>,
    bodySchema?: ZodSchema<Body>
  ): Promise<ApiResponse<T>>;

  delete<T>(path: string, options?: RequestOptions<"DELETE">, schema?: ZodSchema<T>): Promise<ApiResponse<T>>;
}

export interface ApiClientRQHooks {
  useQuery<T>(
    queryKey: QueryKey,
    path: string,
    options?: RequestOptions<"GET">,
    queryOptions?: Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn">,
    schema?: ZodSchema<T>
  ): UseQueryResult<T, Error>;

  useMutation<T, Body>(
    method: Exclude<HttpMethod, "GET">,
    path: string,
    baseOptions?: BaseRequestOptions,
    schema?: ZodSchema<T>,
    bodySchema?: ZodSchema<Body>,
    mutationOptions?: UseMutationOptions<T, Error, Body>
  ): UseMutationResult<T, Error, Body>;
}

export type UseApiReturn = ApiClient & ApiClientRQHooks;

/* =========================================================
 * useApi Hook (FIXED)
 * ========================================================= */

export function useApi(baseUrl: string): UseApiReturn {
  return useMemo(() => {
    return {
      /* ------------------ HTTP helpers ------------------ */

      get<T>(path: string, options?: RequestOptions<"GET">, schema?: ZodSchema<T>) {
        return request<T, "GET">(baseUrl, "GET", path, options, schema);
      },

      post<T, Body>(
        path: string,
        options: RequestOptions<"POST", Body>,
        schema?: ZodSchema<T>,
        bodySchema?: ZodSchema<Body>
      ) {
        return request<T, "POST", Body>(baseUrl, "POST", path, options, schema, bodySchema);
      },

      put<T, Body>(
        path: string,
        options: RequestOptions<"PUT", Body>,
        schema?: ZodSchema<T>,
        bodySchema?: ZodSchema<Body>
      ) {
        return request<T, "PUT", Body>(baseUrl, "PUT", path, options, schema, bodySchema);
      },

      patch<T, Body>(
        path: string,
        options: RequestOptions<"PATCH", Body>,
        schema?: ZodSchema<T>,
        bodySchema?: ZodSchema<Body>
      ) {
        return request<T, "PATCH", Body>(baseUrl, "PATCH", path, options, schema, bodySchema);
      },

      delete<T>(path: string, options?: RequestOptions<"DELETE">, schema?: ZodSchema<T>) {
        return request<T, "DELETE">(baseUrl, "DELETE", path, options, schema);
      },

      /* ---------------- React Query helpers -------------- */

      useQuery<T>(
        queryKey: QueryKey,
        path: string,
        options?: RequestOptions<"GET">,
        queryOptions?: Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn">,
        schema?: ZodSchema<T>
      ): UseQueryResult<T, Error> {
        return rqUseQuery<T, Error, T, QueryKey>({
          queryKey,
          queryFn: () => requestOrThrow<T, "GET">(baseUrl, "GET", path, options, schema),
          ...queryOptions,
        });
      },

      useMutation<T, Body>(
        method: Exclude<HttpMethod, "GET">,
        path: string,
        baseOptions?: BaseRequestOptions,
        schema?: ZodSchema<T>,
        bodySchema?: ZodSchema<Body>,
        mutationOptions?: UseMutationOptions<T, Error, Body>
      ): UseMutationResult<T, Error, Body> {
        return rqUseMutation<T, Error, Body>({
          mutationFn: (body: Body) =>
            requestOrThrow<T, typeof method, Body>(
              baseUrl,
              method,
              path,
              {
                ...(baseOptions ?? {}),
                body,
              } as RequestOptions<typeof method, Body>,
              schema,
              bodySchema
            ),
          ...mutationOptions,
        });
      },
    };
  }, [baseUrl]);
}
