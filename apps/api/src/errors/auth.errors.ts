import { AppError } from "./app.error.js";

/** Shared login failure prevents user enumeration. */
export class InvalidCredentialsError extends AppError {
  constructor() {
    super("invalid credentials", 401);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("unauthorized", 401);
  }
}
