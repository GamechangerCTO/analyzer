import { vi } from 'vitest'

export function createMockQueryBuilder(defaultData: any = null, defaultError: any = null) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: defaultData, error: defaultError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: defaultData, error: defaultError }),
    then: vi.fn().mockImplementation((cb) => cb({ data: defaultData ? [defaultData] : [], error: defaultError })),
  }
  return builder
}

export function createMockSupabase(overrides?: {
  queryData?: any
  queryError?: any
  sessionData?: any
  rpcData?: any
  rpcError?: any
}) {
  const queryBuilder = createMockQueryBuilder(overrides?.queryData, overrides?.queryError)

  const rpcBuilder = {
    single: vi.fn().mockResolvedValue({
      data: overrides?.rpcData ?? null,
      error: overrides?.rpcError ?? null,
    }),
  }

  const mock = {
    from: vi.fn(() => queryBuilder),
    rpc: vi.fn(() => rpcBuilder),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: overrides?.sessionData ?? null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: overrides?.sessionData?.user ?? null },
        error: null,
      }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/file.mp3' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.mp3' } }),
      })),
    },
    _queryBuilder: queryBuilder,
    _rpcBuilder: rpcBuilder,
  }

  return mock
}

// Note: vi.mock() calls must be in each test file directly (they are hoisted).
// Do NOT put vi.mock() inside functions — vitest hoists them out of scope.
