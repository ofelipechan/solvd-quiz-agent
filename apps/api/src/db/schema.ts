import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";

export const questionTypeEnum = pgEnum("question_type", ["single", "multiple"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceUrl: text("source_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  text: text("text").notNull(),
  questionType: questionTypeEnum("question_type").notNull(),
  /** Share of the final score in percent (0-100, two decimals); a quiz's weights add up to 100. */
  weight: numeric("weight", { precision: 5, scale: 2 }).notNull().default("0"),
});

export const options = pgTable("options", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  /** Why this option is correct or incorrect; revealed only after the quiz is submitted. */
  feedback: text("feedback").notNull().default(""),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id)
    .unique(),
  finalScore: numeric("final_score", { precision: 4, scale: 2 }).notNull(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const answers = pgTable("answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id),
  selectedOptionIds: uuid("selected_option_ids").array().notNull(),
  score: numeric("score", { precision: 3, scale: 2 }).notNull(),
});
