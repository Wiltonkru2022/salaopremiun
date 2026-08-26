type QueryResponse<T = unknown> = {
  data: T | null;
  error?: { message?: string } | null;
};

export type DatabaseQueryBuilder<T = unknown> = PromiseLike<QueryResponse<T>> & {
  select(columns: string): DatabaseQueryBuilder<T>;
  eq(column: string, value: unknown): DatabaseQueryBuilder<T>;
  or(filters: string): DatabaseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): DatabaseQueryBuilder<T>;
  limit(count: number): DatabaseQueryBuilder<T>;
  maybeSingle(): Promise<QueryResponse<T>>;
  insert(payload: unknown): Promise<QueryResponse<T>>;
};

export type DatabaseQueryClient = {
  from<T = unknown>(table: string): DatabaseQueryBuilder<T>;
};

export function asDatabaseQueryClient(client: unknown): DatabaseQueryClient {
  return client as DatabaseQueryClient;
}
