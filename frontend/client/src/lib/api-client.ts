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

  // Metodos para TVs
  async listTvs() {
    return this.request('/api/tvs');
  }

  async addTv(data: {
    name: string;
    brand: string;
    ip: string;
    mac?: string;
  }) {
    return this.request('/api/tvs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTv(id: string) {
    return this.request(`/api/tvs/${id}`, {
      method: 'DELETE',
    });
  }

  async getTvStatus(id: string) {
    return this.request(`/api/tvs/${id}/status`);
  }

  // Metodos de controle remoto
  async powerOn(id: string) {
    return this.request(`/api/tvs/${id}/power/on`, {
      method: 'POST',
    });
  }

  async powerOff(id: string) {
    return this.request(`/api/tvs/${id}/power/off`, {
      method: 'POST',
    });
  }

  async powerToggle(id: string) {
    return this.request(`/api/tvs/${id}/power/toggle`, {
      method: 'POST',
    });
  }

  async setVolume(id: string, direction: 'up' | 'down') {
    return this.request(`/api/tvs/${id}/volume/${direction}`, {
      method: 'POST',
    });
  }

  async mute(id: string) {
    return this.request(`/api/tvs/${id}/volume/mute`, {
      method: 'POST',
    });
  }

  async navigate(id: string, action: string) {
    return this.request(`/api/tvs/${id}/nav/${action}`, {
      method: 'POST',
    });
  }

  async openApp(id: string, appName: string) {
    return this.request(`/api/tvs/${id}/app/${appName}`, {
      method: 'POST',
    });
  }

  async getKnownApps() {
    return this.request('/api/tvs/apps/known');
  }

  async bulkPower(action: 'on' | 'off') {
    return this.request(`/api/tvs/bulk/power/${action}`, {
      method: 'POST',
    });
  }

  async scanNetwork() {
    return this.request('/api/discovery/scan');
  }

  async getToken(id: string) {
    return this.request(`/api/tvs/${id}/token`);
  }

  async health() {
    return this.request('/api/health');
  }

  // Metodos de gestao de usuarios (admin only no backend)
  async listUsers() {
    return this.request<{ ok: boolean; users: Array<{ id: string; email: string; name: string; role: string }> }>(
      '/api/users'
    );
  }

  async createUser(data: { email: string; password: string; name: string; role?: 'user' | 'admin' }) {
    return this.request<{ ok: boolean; user: { id: string; email: string; name: string; role: string } }>(
      '/api/users',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteUser(id: string) {
    return this.request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new APIClient(API_BASE_URL);
