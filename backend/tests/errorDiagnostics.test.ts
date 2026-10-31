import { safeErrorDiagnostic } from '../src/middleware/errorHandler';
import { Request } from 'express';

describe('safe server diagnostics', () => {
  it('shows the fixed route and error class without private request or error data', () => {
    const request = { method: 'GET', originalUrl: '/api/authority/complaints/secret-record-value?token=secret-token' } as Request;
    const result = safeErrorDiagnostic(request, { name: 'MongoServerError', code: 42, message: 'secret-value', stack: 'secret-stack' }, 500);
    expect(result).toBe('[Error Handler] HTTP 500 GET /api/authority/complaints/:value MongoServerError code=42');
    expect(result).not.toMatch(/secret/);
  });
  it('does not trust arbitrary error names, codes, or route components', () => {
    const request = { method: 'BAD', originalUrl: '/api/auth/secret-segment' } as Request;
    const result = safeErrorDiagnostic(request, { name: 'secret-name', code: 'secret-code' }, 500);
    expect(result).toBe('[Error Handler] HTTP 500 REQUEST /api/auth/:value UnknownError');
  });
});
