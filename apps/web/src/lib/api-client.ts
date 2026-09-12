import type {
  LoginRequest,
  CreateQuizRequest,
  SubmitRequest,
  SubmitResponse,
} from "@quiz-agent/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Public quiz shape returned by the API — no `isCorrect` flags. */
export interface PublicOption {
  id: string;
  text: string;
}

export interface PublicQuestion {
  id: string;
  orderIndex: number;
  text: string;
  questionType: "single" | "multiple";
  options: PublicOption[];
}

export interface PublicQuiz {
  id: string;
  sourceUrl: string;
  createdAt: string;
  questions: PublicQuestion[];
}

export interface QuizSummary {
  id: string;
  sourceUrl: string;
  createdAt: string;
  finalScore: number | null;
}

/** Thrown when the API responds with a non-2xx status. Carries the status for callers to branch on. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Thin fetch wrapper shared by all API calls. Always sends
 * `credentials: 'include'` so the auth cookie round-trips to the Fastify
 * API, which runs on a different origin/port in dev.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // response had no JSON body; keep the default message
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const authClient = {
  login: (body: LoginRequest) =>
    request<{ ok: true }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
};

export const quizClient = {
  createQuiz: (body: CreateQuizRequest) =>
    request<PublicQuiz>("/api/quizzes", { method: "POST", body: JSON.stringify(body) }),
  submitQuiz: (quizId: string, body: SubmitRequest) =>
    request<SubmitResponse>(`/api/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listQuizzes: () => request<QuizSummary[]>("/api/quizzes"),
};
