import { AppError } from "./app.error.js";

export type SourceFetchErrorKind = "too_large" | "unreachable" | "not_text";

export class SourceFetchError extends AppError {
  readonly kind: SourceFetchErrorKind;

  constructor(kind: SourceFetchErrorKind, message: string) {
    super(message, 422);
    this.kind = kind;
  }
}
