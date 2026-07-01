// Utilitarios de seguranca para o front-end

/**
 * Sanitizar string para prevenir XSS
 * Remove caracteres perigosos e codifica HTML
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validar email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar endereco IP
 */
export function isValidIP(ip: string): boolean {
  const ipRegex =
    /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
  return ipRegex.test(ip);
}

/**
 * Validar endereco MAC
 */
export function isValidMAC(mac: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * Validar forca da senha
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiuscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minuscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um numero');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Gerar hash simples para dados locais
 * NOTA: Nao use para senhas! Use apenas para checksums
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Limpar dados sensveis da memoria
 */
export function clearSensitiveData(obj: Record<string, any>): void {
  Object.keys(obj).forEach((key) => {
    if (
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('secret')
    ) {
      obj[key] = '';
    }
  });
}

/**
 * Verificar se a sessao expirou
 */
export function isSessionExpired(timestamp: number, maxAge: number): boolean {
  return Date.now() - timestamp > maxAge;
}

/**
 * Gerar nonce para CSRF protection
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/**
 * Validar e sanitizar URL
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Apenas permitir http e https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Escapar caracteres especiais para uso em regex
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
