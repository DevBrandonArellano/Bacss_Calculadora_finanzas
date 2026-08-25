import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_SECURITY_POLICY } from './csp.ts';

interface VercelHeader {
  key: string;
  value: string;
}

interface VercelHeaderRule {
  source: string;
  headers: VercelHeader[];
}

interface VercelConfig {
  headers?: VercelHeaderRule[];
}

function readVercelConfig(): VercelConfig {
  // Vitest corre con la raíz del proyecto como cwd.
  return JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf-8')) as VercelConfig;
}

function findHeader(config: VercelConfig, source: string, key: string): string | undefined {
  const rule = config.headers?.find((entry) => entry.source === source);
  return rule?.headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;
}

describe('vercel.json', () => {
  it('envía como header HTTP la misma CSP que se inyecta en el build', () => {
    // La duplicación es inevitable (vercel.json es JSON estático y no puede
    // importar config/csp.ts), así que se verifica que no se desincronice.
    expect(findHeader(readVercelConfig(), '/(.*)', 'Content-Security-Policy')).toBe(
      CONTENT_SECURITY_POLICY,
    );
  });

  it('cachea los assets hasheados como inmutables', () => {
    // Vite versiona los nombres de archivo en /assets, así que son seguros de
    // cachear indefinidamente: cada deploy genera nombres nuevos.
    expect(findHeader(readVercelConfig(), '/assets/(.*)', 'Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('cachea de forma conservadora los assets sin hash', () => {
    // favicon.svg e icons.svg se sirven con nombre fijo desde public/: si se
    // cachearan como inmutables, un cambio no llegaría nunca a los usuarios.
    expect(findHeader(readVercelConfig(), '/(favicon.svg|icons.svg)', 'Cache-Control')).toBe(
      'public, max-age=3600, must-revalidate',
    );
  });

  it('obliga a revalidar el index.html en cada visita', () => {
    // Sin esto, un index.html cacheado seguiría apuntando a los assets del
    // deploy anterior y los usuarios no verían la versión nueva.
    expect(findHeader(readVercelConfig(), '/index.html', 'Cache-Control')).toBe(
      'public, max-age=0, must-revalidate',
    );
  });

  it('declara los headers de seguridad esperados', () => {
    const config = readVercelConfig();
    expect(findHeader(config, '/(.*)', 'X-Content-Type-Options')).toBe('nosniff');
    expect(findHeader(config, '/(.*)', 'Referrer-Policy')).toBe('no-referrer');
    expect(findHeader(config, '/(.*)', 'Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
    expect(findHeader(config, '/(.*)', 'Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );
  });
});
