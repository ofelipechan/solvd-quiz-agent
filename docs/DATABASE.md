# Database Schema

PostgreSQL via Drizzle ORM. Source of truth: [`apps/api/src/db/schema.ts`](../apps/api/src/db/schema.ts).

## Entity-Relationship Diagram

```mermaid
erDiagram
    users {
        uuid id PK "defaultRandom()"
        text email UK "not null"
        text password_hash "not null"
        timestamp created_at "not null, default now()"
    }

    quizzes {
        uuid id PK "defaultRandom()"
        text source_url "not null"
        timestamp created_at "not null, default now()"
    }

    questions {
        uuid id PK "defaultRandom()"
        uuid quiz_id FK "not null, on delete cascade"
        integer order_index "not null"
        text text "not null"
        question_type question_type "enum: single | multiple, not null"
        numeric weight "numeric(5,2), not null, default 0 — share of final score in %"
    }

    options {
        uuid id PK "defaultRandom()"
        uuid question_id FK "not null, on delete cascade"
        text text "not null"
        boolean is_correct "not null"
        text feedback "not null, default '' — why this option is right or wrong"
    }

    submissions {
        uuid id PK "defaultRandom()"
        uuid quiz_id FK,UK "not null, unique (one submission per quiz)"
        numeric final_score "numeric(4,2), not null"
        timestamp submitted_at "not null, default now()"
    }

    answers {
        uuid id PK "defaultRandom()"
        uuid submission_id FK "not null, on delete cascade"
        uuid question_id FK "not null"
        uuid[] selected_option_ids "not null, array of options.id"
        numeric score "numeric(3,2), not null"
    }

    quizzes ||--o{ questions : "has"
    questions ||--o{ options : "has"
    quizzes ||--o| submissions : "receives"
    submissions ||--o{ answers : "contains"
    questions ||--o{ answers : "answered by"
    options }o..o{ answers : "referenced via selected_option_ids (no FK)"
```

## Enums

| Name | Values |
| --- | --- |
| `question_type` | `single`, `multiple` |

## Relationships

| Parent | Child | FK column | Cardinality | On delete |
| --- | --- | --- | --- | --- |
| `quizzes` | `questions` | `questions.quiz_id` | 1 → N | cascade |
| `questions` | `options` | `options.question_id` | 1 → N | cascade |
| `quizzes` | `submissions` | `submissions.quiz_id` | 1 → 0..1 (unique) | no action |
| `submissions` | `answers` | `answers.submission_id` | 1 → N | cascade |
| `questions` | `answers` | `answers.question_id` | 1 → N | no action |
| `options` | `answers` | `answers.selected_option_ids` (uuid array) | N ↔ N | none (no FK constraint) |

## Notes

- `users` is standalone — no FK links to quizzes or submissions today.
- `questions.weight` values within a quiz sum to 100.
- `answers.selected_option_ids` is a `uuid[]`; referential integrity to `options` is enforced at the application layer, not by the database.
- Only `users`, `quizzes` and `submissions` carry timestamps; `questions`, `options`, `answers` have none.
- `options.feedback` is part of the answer key alongside `is_correct`: the API only reveals it once the quiz has been submitted. It defaults to `''` so options created before the column existed stay valid.
