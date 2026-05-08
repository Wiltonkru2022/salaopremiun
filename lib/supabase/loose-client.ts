type LooseSupabaseError = {
  message?: string;
};

type LooseSupabaseResult<T = unknown> = {
  data: T;
  error: LooseSupabaseError | null;
  count?: number | null;
};

export type LooseSupabaseQuery<T = unknown> = PromiseLike<LooseSupabaseResult<T>> & {
  select(columns?: string, options?: Record<string, unknown>): LooseSupabaseQuery<T>;
  insert(values: unknown, options?: Record<string, unknown>): LooseSupabaseQuery<T>;
  update(values: unknown, options?: Record<string, unknown>): LooseSupabaseQuery<T>;
  upsert(values: unknown, options?: Record<string, unknown>): LooseSupabaseQuery<T>;
  delete(options?: Record<string, unknown>): LooseSupabaseQuery<T>;
  eq(column: string, value: unknown): LooseSupabaseQuery<T>;
  in(column: string, values: unknown[]): LooseSupabaseQuery<T>;
  is(column: string, value: unknown): LooseSupabaseQuery<T>;
  gte(column: string, value: unknown): LooseSupabaseQuery<T>;
  gt(column: string, value: unknown): LooseSupabaseQuery<T>;
  lte(column: string, value: unknown): LooseSupabaseQuery<T>;
  lt(column: string, value: unknown): LooseSupabaseQuery<T>;
  ilike(column: string, value: string): LooseSupabaseQuery<T>;
  or(filters: string): LooseSupabaseQuery<T>;
  order(column: string, options?: Record<string, unknown>): LooseSupabaseQuery<T>;
  limit(count: number): LooseSupabaseQuery<T>;
  maybeSingle<Row = T>(): PromiseLike<LooseSupabaseResult<Row | null>>;
  single<Row = T>(): PromiseLike<LooseSupabaseResult<Row>>;
};

export type LooseSupabaseClient = {
  from<T = unknown>(table: string): LooseSupabaseQuery<T>;
  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>
  ): PromiseLike<LooseSupabaseResult<T>>;
};

export function asLooseSupabaseClient(client: unknown): LooseSupabaseClient {
  return client as LooseSupabaseClient;
}
