export class ApiError extends Error {
  statusCode: number;
  errors: any[];

  constructor(statusCode: number, message: string, errors: any[] = [], public readonly safeToExpose = false) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
