type LooseDbError = {
  message?: string;
};

type LooseDbResult<T = unknown> = {
  data: T;
  error: LooseDbError | null;
  count?: number | null;
};

export type LooseDbQuery<T = unknown> = PromiseLike<LooseDbResult<T>> & {
  select(columns?: string, options?: Record<string, unknown>): LooseDbQuery<T>;
  insert(values: unknown, options?: Record<string, unknown>): LooseDbQuery<T>;
  update(values: unknown, options?: Record<string, unknown>): LooseDbQuery<T>;
  upsert(values: unknown, options?: Record<string, unknown>): LooseDbQuery<T>;
  delete(options?: Record<string, unknown>): LooseDbQuery<T>;
  eq(column: string, value: unknown): LooseDbQuery<T>;
  neq(column: string, value: unknown): LooseDbQuery<T>;
  in(column: string, values: unknown[]): LooseDbQuery<T>;
  is(column: string, value: unknown): LooseDbQuery<T>;
  gte(column: string, value: unknown): LooseDbQuery<T>;
  gt(column: string, value: unknown): LooseDbQuery<T>;
  lte(column: string, value: unknown): LooseDbQuery<T>;
  lt(column: string, value: unknown): LooseDbQuery<T>;
  like(column: string, value: string): LooseDbQuery<T>;
  ilike(column: string, value: string): LooseDbQuery<T>;
  contains(column: string, value: unknown): LooseDbQuery<T>;
  or(filters: string): LooseDbQuery<T>;
  match(values: Record<string, unknown>): LooseDbQuery<T>;
  order(column: string, options?: Record<string, unknown>): LooseDbQuery<T>;
  limit(count: number): LooseDbQuery<T>;
  range(from: number, to: number): LooseDbQuery<T>;
  maybeSingle<Row = T>(): PromiseLike<LooseDbResult<Row | null>>;
  single<Row = T>(): PromiseLike<LooseDbResult<Row>>;
  throwOnError(): LooseDbQuery<T>;
};

export type LooseDbClient = {
  from<T = unknown>(table: string): LooseDbQuery<T>;
  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>
  ): PromiseLike<LooseDbResult<T>>;
};

export function asLooseDbClient(client: unknown): LooseDbClient {
  return client as LooseDbClient;
}
