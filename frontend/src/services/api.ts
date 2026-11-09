const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }, ...init })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || 'Request failed'), { status: res.status, data })
  return data as T
}

function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.set(k, String(v)) })
  const str = s.toString()
  return str ? `?${str}` : ''
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(p: string, body?: unknown) => request<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
  auth: {
    me: () => request<any>('/auth/me'),
    login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    twoFactor: {
      setup: () => request<any>('/auth/2fa/setup', { method: 'POST' }),
      confirm: (code: string) => request<any>('/auth/2fa/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
      disable: (body: any) => request<any>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify(body) }),
      verify: (body: any) => request<any>('/auth/2fa/verify', { method: 'POST', body: JSON.stringify(body) }),
    },
  },
  products: {
    list: (params: Record<string, string | number | undefined | null> = {}) =>
      request<any>(`/products${qs(typeof params === 'string' ? {} : params)}${typeof params === 'string' ? params : ''}`),
    get: (id: string) => request<any>(`/products/${id}`),
    related: (category?: string, exclude?: string) =>
      request<any>(`/products${qs({ category, limit: 8, sort: 'recommended' })}`).then((r: any) => ({
        ...r,
        data: (r.data || []).filter((p: any) => p.slug !== exclude && p.id !== exclude),
      })),
  },
  categories: { list: () => request<any>('/categories') },
  cart: {
    get: () => request<any>('/cart'),
    add: (body: any) => request<any>('/cart/items', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/cart/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => request<any>(`/cart/items/${id}`, { method: 'DELETE' }),
  },
  wishlist: {
    get: () => request<any>('/wishlist'),
    add: (productId: string) => request<any>('/wishlist/items', { method: 'POST', body: JSON.stringify({ productId }) }),
    remove: (id: string) => request<any>(`/wishlist/items/${id}`, { method: 'DELETE' }),
  },
  orders: {
    create: (body: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(body) }),
    my: () => request<any>('/orders/my'),
    track: (n: string) => request<any>(`/orders/track/${encodeURIComponent(n)}`),
    lookupGuest: (body: any) => request<any>('/orders/lookup', { method: 'POST', body: JSON.stringify(body) }),
  },
  account: {
    addresses: () => request<any>('/account/addresses'),
    addAddress: (body: any) => request<any>('/account/addresses', { method: 'POST', body: JSON.stringify(body) }),
    deleteAddress: (id: string) => request<any>(`/account/addresses/${id}`, { method: 'DELETE' }),
    notifications: () => request<any>('/account/notifications'),
    markNotificationRead: (id: string) => request<any>(`/account/notifications/${id}/read`, { method: 'PUT' }),
    updateProfile: (body: any) => request<any>('/account/profile', { method: 'PUT', body: JSON.stringify(body) }),
  },
  admin: {
    dashboard: () => request<any>('/admin/dashboard'),
    inventory: () => request<any>('/admin/inventory'),
    orders: () => request<any>('/admin/orders'),
    customers: () => request<any>('/admin/customers'),
    reports: () => request<any>('/admin/reports'),
  },
}
