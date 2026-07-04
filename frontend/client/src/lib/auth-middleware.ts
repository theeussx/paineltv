import { sanitizeString, isValidEmail, validatePassword } from './security';

/**
 * Middleware para validar e sanitizar dados de login
 */
export function validateLoginInput(
  email: string,
  password: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar email
  if (!email || email.trim().length === 0) {
    errors.push('Email eh obrigatorio');
  } else if (!isValidEmail(email)) {
    errors.push('Email invalido');
  }

  // Validar senha
  if (!password || password.length === 0) {
    errors.push('Senha eh obrigatoria');
  } else if (password.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Middleware para validar e sanitizar dados de registro
 */
export function validateRegisterInput(
  email: string,
  password: string,
  name: string,
  confirmPassword: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar nome
  if (!name || name.trim().length === 0) {
    errors.push('Nome eh obrigatorio');
  } else if (name.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  } else if (name.length > 100) {
    errors.push('Nome nao pode ter mais de 100 caracteres');
  }

  // Validar email
  if (!email || email.trim().length === 0) {
    errors.push('Email eh obrigatorio');
  } else if (!isValidEmail(email)) {
    errors.push('Email invalido');
  }

  // Validar senha
  if (!password || password.length === 0) {
    errors.push('Senha eh obrigatoria');
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }

  // Validar confirmacao de senha
  if (password !== confirmPassword) {
    errors.push('As senhas nao correspondem');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizar dados de usuario para armazenamento
 */
export function sanitizeUserData(user: any): {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
} {
  return {
    id: sanitizeString(user.id || ''),
    email: sanitizeString(user.email || ''),
    name: sanitizeString(user.name || ''),
    role: user.role === 'admin' ? 'admin' : 'user',
  };
}

/**
 * Verificar se o token de sessao eh valido
 */
export function isValidSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Token nao deve conter caracteres suspeitos
  const validTokenRegex = /^[a-zA-Z0-9_-]+$/;
  return validTokenRegex.test(token);
}

/**
 * Criar headers seguros para requisicoes
 */
export function createSecureHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (token && isValidSessionToken(token)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Verificar se a sessao expirou
 */
export function checkSessionExpiry(
  timestamp: number,
  maxAgeMs: number
): boolean {
  return Date.now() - timestamp > maxAgeMs;
}

/**
 * Limpar dados sensveis do localStorage
 */
export function clearAuthStorage(): void {
  const keysToRemove = ['wardcontroll_auth'];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Erro ao limpar ${key}:`, error);
    }
  });
}

/**
 * Validar estrutura de dados de autenticacao
 */
export function validateAuthData(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (!data.user || typeof data.user !== 'object') {
    return false;
  }

  if (
    !data.user.id ||
    !data.user.email ||
    typeof data.user.id !== 'string' ||
    typeof data.user.email !== 'string'
  ) {
    return false;
  }

  if (typeof data.token !== 'string' || data.token.length === 0) {
    return false;
  }

  if (typeof data.timestamp !== 'number' || data.timestamp <= 0) {
    return false;
  }

  return true;
}
