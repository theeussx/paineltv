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
export function useTVs() {
  const { data, isLoading, error, execute } = useAPI<any>();

  const loadTVs = useCallback(async () => {
    return execute(() => apiClient.listTvs());
  }, [execute]);

  return { tvs: data?.tvs || [], isLoading, error, loadTVs };
}

/**
 * Hook para controlar uma TV especifica
 */
export function useTVControl(tvId: string) {
  const { isLoading, error, execute } = useAPI<any>();

  const powerOn = useCallback(
    () => execute(() => apiClient.powerOn(tvId)),
    [tvId, execute]
  );

  const powerOff = useCallback(
    () => execute(() => apiClient.powerOff(tvId)),
    [tvId, execute]
  );

  const powerToggle = useCallback(
    () => execute(() => apiClient.powerToggle(tvId)),
    [tvId, execute]
  );

  const volumeUp = useCallback(
    () => execute(() => apiClient.setVolume(tvId, 'up')),
    [tvId, execute]
  );

  const volumeDown = useCallback(
    () => execute(() => apiClient.setVolume(tvId, 'down')),
    [tvId, execute]
  );

  const mute = useCallback(
    () => execute(() => apiClient.mute(tvId)),
    [tvId, execute]
  );

  const navigate = useCallback(
    (action: string) => execute(() => apiClient.navigate(tvId, action)),
    [tvId, execute]
  );

  const openApp = useCallback(
    (appName: string) => execute(() => apiClient.openApp(tvId, appName)),
    [tvId, execute]
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
