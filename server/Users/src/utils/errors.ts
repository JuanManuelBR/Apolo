export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;

    // Necesario para instanceof en TS
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export function throwHttpError(message: string, status: number): never {
  throw new HttpError(message, status);
}