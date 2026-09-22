import { AppError } from "./app.error.js";

export class QuizNotFoundError extends AppError {
  constructor() {
    super("quiz not found", 404);
  }
}

export class InvalidAnswerError extends AppError {
  constructor() {
    super("selected option does not belong to the referenced question", 400);
  }
}

export class InsufficientContentError extends AppError {
  constructor() {
    super("source content is too short to generate a quiz", 422);
  }
}

export class DuplicateSubmissionError extends AppError {
  constructor() {
    super("quiz already submitted", 409);
  }
}

export class GenerationFailedError extends AppError {
  constructor() {
    super("quiz generation failed", 502);
  }
}
