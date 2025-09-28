import { NextRequest } from 'next/server'

// Optional environment variables
// ZGS_STORAGE_URL: base URL of your 0G Storage gateway (e.g., https://your-0g-gateway)
// ZGS_API_KEY: optional API key if your gateway requires authentication
const GATEWAY_URL = process.env.ZGS_STORAGE_URL
const GATEWAY_API_KEY = process.env.ZGS_API_KEY
const ZERO_G_RPC_URL = process.env.ZERO_G_RPC_URL

// Helper to build the storage key per your spec
function buildKey(wallet: string) {
  return `${wallet}_total_shares`
}

// In-memory demo DB for server session persistence when no storage is configured
const DEMO_DB: Map<string, any[]> = new Map()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const walletRaw = String(body?.wallet || '').toLowerCase()
    const item = body?.item

    if (!walletRaw) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const key = buildKey(walletRaw)

    // Validate and coerce the item shape
    const safeItem = {
      name: String(item?.name ?? ''),
      price: Number(item?.price ?? 0),
      quantity: Number(item?.quantity ?? 0),
      minted: Boolean(item?.minted ?? false),
    }

    // If gateway configured, read-modify-write
    if (GATEWAY_URL) {
      // 1) Read existing
      let existing: any[] = []
      try {
        const getUrl = new URL('/api/storage/get', GATEWAY_URL)
        getUrl.searchParams.set('key', key)
        const getRes = await fetch(getUrl.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            ...(GATEWAY_API_KEY ? { 'Authorization': `Bearer ${GATEWAY_API_KEY}` } : {}),
          },
        })
        if (getRes.ok) {
          const data = await getRes.json()
          existing = Array.isArray(data?.items) ? data.items : []
        }
      } catch (_) {}

      // 2) Append
      const nextItems = [...existing, safeItem]

      // 3) Write back
      const setUrl = new URL('/api/storage/set', GATEWAY_URL)
      const setRes = await fetch(setUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(GATEWAY_API_KEY ? { 'Authorization': `Bearer ${GATEWAY_API_KEY}` } : {}),
        },
        body: JSON.stringify({ key, items: nextItems }),
      })
      if (!setRes.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to write portfolio (${setRes.status})` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ key, items: nextItems }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Demo mode: no storage, persist in memory for this server process
    if (ZERO_G_RPC_URL) {
      const current = DEMO_DB.get(key) ?? []
      const next = [...current, safeItem]
      DEMO_DB.set(key, next)
      return new Response(
        JSON.stringify({ key, items: next }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Neither storage nor demo configured: no-op but return item in items to keep UI responsive
    return new Response(
      JSON.stringify({ key, items: [safeItem] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')?.toLowerCase()

  if (!wallet) {
    return new Response(
      JSON.stringify({ error: 'Missing wallet query parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const key = buildKey(wallet)

  // If gateway not configured, but demo RPC is provided, return only items added in this session
  if (!GATEWAY_URL && ZERO_G_RPC_URL) {
    const items = DEMO_DB.get(key) ?? []
    return new Response(
      JSON.stringify({ key, items }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // If neither storage nor demo RPC is configured, return empty items to keep UI functional
  if (!GATEWAY_URL) {
    return new Response(
      JSON.stringify({ key, items: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Example: assume a simple key-value storage API
    // You may need to adjust to match your actual 0G storage API surface.
    const url = new URL('/api/storage/get', GATEWAY_URL)
    url.searchParams.set('key', key)

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(GATEWAY_API_KEY ? { 'Authorization': `Bearer ${GATEWAY_API_KEY}` } : {}),
      },
      // Next.js edge/runtime fetch options could be added here if needed
    })

    if (!res.ok) {
      // If key not found, return empty items
      if (res.status === 404) {
        return new Response(
          JSON.stringify({ key, items: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Gateway error ${res.status}`)
    }

    // Expected payload format example:
    // {
    //   key: "<wallet>_total_shares",
    //   items: [{ name: string, price: number, quantity: number, minted: boolean }]
    // }
    const data = await res.json()

    // Validate and coerce to a safe shape
    const items = Array.isArray(data?.items) ? data.items : []
    const safe = items.map((it: any) => ({
      name: String(it?.name ?? ''),
      price: Number(it?.price ?? 0),
      quantity: Number(it?.quantity ?? 0),
      minted: Boolean(it?.minted ?? false),
    }))

    return new Response(
      JSON.stringify({ key, items: safe }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ key, items: [], error: e?.message || 'Failed to fetch from storage' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
