import type { DomainError } from '../../domain/shared/errors';

export function translateDomainError(error: DomainError): string {
  switch (error.code) {
    case 'INVALID_INPUT':
      return `Valor inválido: ${error.message}`;
    case 'NEGATIVE_AMOUNT':
      return `El monto no puede ser negativo: ${error.message}`;
    case 'OUT_OF_RANGE':
      return `Valor fuera de rango: ${error.message}`;
    case 'CURRENCY_MISMATCH':
      return `Las monedas no coinciden: ${error.message}`;
    default:
      return error.message;
  }
}
