const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  listTvs: () => request('/api/tvs'),
  addTv: (payload) => request('/api/tvs', { method: 'POST', body: JSON.stringify(payload) }),
  deleteTv: (id) => request(`/api/tvs/${id}`, { method: 'DELETE' }),
  getToken: (id) => request(`/api/tvs/${id}/token`),
  scan: () => request('/api/discovery/scan'),
  status: (id) => request(`/api/tvs/${id}/status`),
  powerOn: (id) => request(`/api/tvs/${id}/power/on`, { method: 'POST' }),
  powerOff: (id) => request(`/api/tvs/${id}/power/off`, { method: 'POST' }),
  powerToggle: (id) => request(`/api/tvs/${id}/power/toggle`, { method: 'POST' }),
  volume: (id, direction) => request(`/api/tvs/${id}/volume/${direction}`, { method: 'POST' }),
  nav: (id, action) => request(`/api/tvs/${id}/nav/${action}`, { method: 'POST' }),
  key: (id, key) => request(`/api/tvs/${id}/key/${key}`, { method: 'POST' }),
  apps: () => request('/api/tvs/apps/known'),
  openApp: (id, appName) => request(`/api/tvs/${id}/app/${appName}`, { method: 'POST' }),
  bulkPower: (action) => request(`/api/tvs/bulk/power/${action}`, { method: 'POST' }),
};
