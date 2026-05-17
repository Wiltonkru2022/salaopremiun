type QueryResponse<T = unknown> = {
  data: T | null;
  error?: { message?: string } | null;
};

export type SupabaseQueryBuilder<T = unknown> = PromiseLike<QueryResponse<T>> & {
  select(columns: string): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  or(filters: string): SupabaseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  limit(count: number): SupabaseQueryBuilder<T>;
  maybeSingle(): Promise<QueryResponse<T>>;
  insert(payload: unknown): Promise<QueryResponse<T>>;
};

export type SupabaseQueryClient = {
  from<T = unknown>(table: string): SupabaseQueryBuilder<T>;
};

export function asSupabaseQueryClient(client: unknown): SupabaseQueryClient {
  return client as SupabaseQueryClient;
}
