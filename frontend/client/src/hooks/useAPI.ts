import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface UseAPIState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook customizado para fazer requisicoes de API com tratamento de erro
 * Fornece loading state e error handling automatico
 */
export function useAPI<T>() {
  const [state, setState] = useState<UseAPIState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (fn: () => Promise<T>) => {
      setState({ data: null, isLoading: true, error: null });
      try {
        const result = await fn();
        setState({ data: result, isLoading: false, error: null });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Erro desconhecido');
        setState({ data: null, isLoading: false, error: err });
        throw err;
      }
    },
    []
  );

  return { ...state, execute };
}

/**
 * Hook para listar TVs com tratamento de erro
 */
export function useTVs(locationId: string) {
  const { data, isLoading, error, execute } = useAPI<any>();

  const loadTVs = useCallback(async () => {
    return execute(() => apiClient.listTvs(locationId));
  }, [execute, locationId]);

  return { tvs: data?.tvs || [], isLoading, error, loadTVs };
}

/**
 * Hook para controlar uma TV especifica
 */
export function useTVControl(locationId: string, tvId: string) {
  const { isLoading, error, execute } = useAPI<any>();

  const powerOn = useCallback(
    () => execute(() => apiClient.powerOn(locationId, tvId)),
    [locationId, tvId, execute]
  );

  const powerOff = useCallback(
    () => execute(() => apiClient.powerOff(locationId, tvId)),
    [locationId, tvId, execute]
  );

  const powerToggle = useCallback(
    () => execute(() => apiClient.powerToggle(locationId, tvId)),
    [locationId, tvId, execute]
  );

  const volumeUp = useCallback(
    () => execute(() => apiClient.setVolume(locationId, tvId, 'up')),
    [locationId, tvId, execute]
  );

  const volumeDown = useCallback(
    () => execute(() => apiClient.setVolume(locationId, tvId, 'down')),
    [locationId, tvId, execute]
  );

  const mute = useCallback(
    () => execute(() => apiClient.mute(locationId, tvId)),
    [locationId, tvId, execute]
  );

  const navigate = useCallback(
    (action: string) => execute(() => apiClient.navigate(locationId, tvId, action)),
    [locationId, tvId, execute]
  );

  const openApp = useCallback(
    (appName: string) => execute(() => apiClient.openApp(locationId, tvId, appName)),
    [locationId, tvId, execute]
  );

  return {
    isLoading,
    error,
    powerOn,
    powerOff,
    powerToggle,
    volumeUp,
    volumeDown,
    mute,
    navigate,
    openApp,
  };
}
