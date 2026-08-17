import { describe, it, expect, vi, afterEach } from 'vitest';
import { Rfc5424Logger } from './rfc5424Logger';

describe('Rfc5424Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const severities = [
    { severity: 'emergency', consoleMethod: 'error' },
    { severity: 'alert', consoleMethod: 'error' },
    { severity: 'critical', consoleMethod: 'error' },
    { severity: 'error', consoleMethod: 'error' },
    { severity: 'warning', consoleMethod: 'warn' },
    { severity: 'notice', consoleMethod: 'info' },
    { severity: 'informational', consoleMethod: 'info' },
    { severity: 'debug', consoleMethod: 'debug' },
  ] as const;

  it.each(severities)(
    'debe enrutar severidad "$severity" a console.$consoleMethod',
    ({ severity, consoleMethod }) => {
      const spy = vi.spyOn(console, consoleMethod).mockImplementation(() => undefined);
      const logger = new Rfc5424Logger();

      logger.log({ severity, message: `test ${severity}` });

      expect(spy).toHaveBeenCalledOnce();
    },
  );

  it('debe incluir timestamp, severidad y mensaje en la salida serializada', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new Rfc5424Logger();

    logger.log({ severity: 'error', message: 'algo falló' });

    const output = spy.mock.calls[0]?.[0] as string;
    expect(output).toContain('error');
    expect(output).toContain('algo falló');
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
  });

  it('debe incluir el context provisto en la salida serializada', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new Rfc5424Logger();

    logger.log({ severity: 'error', message: 'algo falló', context: { userId: '123' } });

    const output = spy.mock.calls[0]?.[0] as string;
    expect(output).toContain('userId');
    expect(output).toContain('123');
  });

  it('debe excluir campos que luzcan sensibles del context (password, token, secret, key)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new Rfc5424Logger();

    logger.log({
      severity: 'error',
      message: 'login falló',
      context: {
        username: 'brandon',
        password: 'super-secreto',
        apiToken: 'abc123',
        clientSecret: 'xyz789',
        sessionKey: 'k-999',
      },
    });

    const output = spy.mock.calls[0]?.[0] as string;
    expect(output).toContain('username');
    expect(output).not.toContain('super-secreto');
    expect(output).not.toContain('abc123');
    expect(output).not.toContain('xyz789');
    expect(output).not.toContain('k-999');
  });

  it('debe funcionar sin context provisto', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new Rfc5424Logger();

    expect(() => {
      logger.log({ severity: 'error', message: 'sin contexto' });
    }).not.toThrow();
    expect(spy).toHaveBeenCalledOnce();
  });
});
