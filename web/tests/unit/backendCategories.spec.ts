import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { categoryIdFor, categorySlugFor, resetCategoryCache } from '@/lib/backendCategories'

const BASE = 'http://test.local/api/v1'
const CATEGORIES = [
  { id: 'uuid-food', slug: 'food' },
  { id: 'uuid-other', slug: 'other' },
]

describe('backendCategories', () => {
  afterEach(() => resetCategoryCache())

  it('fetches /categories once and resolves slug -> id and id -> slug both ways', async () => {
    let calls = 0
    server.use(
      http.get(`${BASE}/categories`, () => {
        calls++
        return HttpResponse.json(CATEGORIES)
      }),
    )

    expect(await categoryIdFor('food')).toBe('uuid-food')
    expect(await categorySlugFor('uuid-food')).toBe('food')
    expect(await categoryIdFor('other')).toBe('uuid-other')
    expect(calls).toBe(1)
  })

  it('falls back to "other" for an unknown backend category id', async () => {
    server.use(http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)))
    expect(await categorySlugFor('does-not-exist')).toBe('other')
  })

  it('throws for an unknown slug rather than silently returning undefined', async () => {
    server.use(http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)))
    // @ts-expect-error - deliberately passing a slug outside CategoryId to exercise the error path
    await expect(categoryIdFor('not-a-real-category')).rejects.toThrow('Unknown category')
  })

  it('does not wedge the cache forever after a failed first fetch (regression)', async () => {
    let calls = 0
    server.use(
      http.get(`${BASE}/categories`, () => {
        calls++
        if (calls === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json(CATEGORIES)
      }),
    )

    await expect(categoryIdFor('food')).rejects.toThrow()
    // Before the fix, `load()` cached the rejected promise itself, so this
    // second call would reuse and re-throw the same rejection forever
    // instead of retrying the request.
    expect(await categoryIdFor('food')).toBe('uuid-food')
    expect(calls).toBe(2)
  })
})
