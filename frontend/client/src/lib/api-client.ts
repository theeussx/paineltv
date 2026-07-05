// API Client para comunicacao com o backend
// Este arquivo fornece funcoes seguras para fazer requisicoes HTTP

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Adicionar token de autenticacao se existir
    const tokenData = localStorage.getItem('wardcontroll_auth');
    if (tokenData) {
      try {
        const auth = JSON.parse(tokenData);
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
      } catch (error) {
        console.error('Erro ao ler token:', error);
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido na requisicao');
    }
  }

  async health() {
    return this.request('/api/health');
  }

  // ---------- Locais (só owner) ----------
  // Cada local é atendido por um agente que roda perto das TVs de lá.
  // O central nunca fala direto com nenhuma TV.

  async listLocations() {
    return this.request<{
      ok: boolean;
      locations: Array<{ id: string; name: string; createdAt: string; online: boolean }>;
    }>('/api/locations');
  }

  async createLocation(name: string) {
    return this.request<{
      ok: boolean;
      location: { id: string; name: string; createdAt: string };
      token: string;
    }>('/api/locations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteLocation(id: string) {
    return this.request(`/api/locations/${id}`, { method: 'DELETE' });
  }

  async rotateLocationToken(id: string) {
    return this.request<{ ok: boolean; token: string }>(`/api/locations/${id}/rotate-token`, {
      method: 'POST',
    });
  }

  // ---------- Usuários de um local (admin daquele local, ou owner) ----------

  async listUsers(locationId: string) {
    return this.request<{
      ok: boolean;
      users: Array<{ id: string; email: string; name: string; role: string; locationId: string | null }>;
    }>(`/api/locations/${locationId}/users`);
  }

  async createUser(
    locationId: string,
    data: { email: string; password: string; name: string; role?: 'user' | 'admin' }
  ) {
    return this.request<{ ok: boolean; user: { id: string; email: string; name: string; role: string } }>(
      `/api/locations/${locationId}/users`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteUser(locationId: string, userId: string) {
    return this.request(`/api/locations/${locationId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // ---------- TVs de um local (proxy -> agente daquele local) ----------

  async listTvs(locationId: string) {
    return this.request(`/api/locations/${locationId}/tvs`);
  }

  async addTv(locationId: string, data: { name: string; brand: string; ip: string; mac?: string }) {
    return this.request(`/api/locations/${locationId}/tvs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTv(locationId: string, id: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}`, {
      method: 'DELETE',
    });
  }

  async getTvStatus(locationId: string, id: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}/status`);
  }

  async powerOn(locationId: string, id: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}/power/on`, { method: 'POST' });
  }

  async powerOff(locationId: string, id: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}/power/off`, { method: 'POST' });
  }

  async powerToggle(locationId: string, id: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}/power/toggle`, { method: 'POST' });
  }

  async setVolume(locationId: string, id: string, direction: 'up' | 'down') {
    return this.request(`/api/locations/${locationId}/tvs/${id}/volume/${direction}`, { method: 'POST' });
  }

  async mute(locationId: string, id: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}/volume/mute`, { method: 'POST' });
  }

  async navigate(locationId: string, id: string, action: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}/nav/${action}`, { method: 'POST' });
  }

  async openApp(locationId: string, id: string, appName: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}/app/${appName}`, { method: 'POST' });
  }

  async getKnownApps(locationId: string) {
    return this.request(`/api/locations/${locationId}/tvs/apps/known`);
  }

  async bulkPower(locationId: string, action: 'on' | 'off') {
    return this.request(`/api/locations/${locationId}/tvs/bulk/power/${action}`, { method: 'POST' });
  }

  async scanNetwork(locationId: string) {
    return this.request(`/api/locations/${locationId}/tvs/discovery/scan`, { method: 'POST' });
  }

  async getToken(locationId: string, id: string) {
    return this.request(`/api/locations/${locationId}/tvs/${id}/token`);
  }
}

export const apiClient = new APIClient(API_BASE_URL);
