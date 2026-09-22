Feature: Submit answers to a quiz and receive the score
  As the admin
  I want to submit my selected options once and get per-question correctness plus the final score
  So that I know how I did, and a quiz can never be re-scored

  # Single-pass: one submission per quiz; a second attempt is refused as a
  # duplicate. Missing answers score 0 rather than rejecting the submission.
  # The correct option ids are revealed only in the submission result.
  # Spec: SCORE-01..06.

  Background:
    Given the admin is signed in with a valid session
    And a persisted quiz with a single-answer question and a multiple-answer question

  # ============================================================
  # Group: Submitting answers
  # ============================================================

  @integration
  Scenario: a valid submission returns the score and per-question correctness
    When the admin submits one answer per question
    Then the submission succeeds
    And the result carries the final score
    And each answer carries its question, whether it was correct, its score and the correct option ids

  @integration
  Scenario: submitting to an unknown quiz is rejected as not found
    When the admin submits answers for a quiz id that does not exist
    Then the submission is rejected as not found

  @integration
  Scenario: an answer with an option from another question is rejected as invalid
    When the admin submits an answer whose selected options belong to a different question
    Then the submission is rejected as invalid

  @integration
  Scenario: a second submission for the same quiz is rejected as a duplicate
    Given the quiz already has a submission
    When the admin submits answers again
    Then the submission is rejected as a duplicate

  @integration
  Scenario: submitting without a session is rejected
    Given no session
    When answers are submitted
    Then the request is rejected as unauthenticated
    And nothing is scored or persisted

  # ============================================================
  # Group: Scoring a submission
  # ============================================================

  @unit
  Scenario: a fully correct submission scores 4 on every question and overall
    When both questions are answered correctly
    Then each answer reports correct, score 4 and its correct option ids
    And the final score is 4

  @unit
  Scenario: a question left unanswered scores 0
    When only the single-answer question is answered
    Then the multiple-answer question reports incorrect with score 0
    And its correct option ids are still returned

  @unit
  Scenario: an option from another question is rejected as an invalid answer
    When an answer selects an option that belongs to a different question
    Then the submission is rejected as an invalid answer

  @unit
  Scenario: a repeated submission is rejected as a duplicate
    Given the quiz already has a submission
    When answers are submitted again
    Then the submission is rejected as a duplicate

  @unit
  Scenario: submitting to a quiz that does not exist is rejected as not found
    When answers are submitted for a quiz id that does not exist
    Then the submission is rejected as not found

  # ============================================================
  # Group: Persistence of a submission
  # ============================================================

  @integration
  Scenario: the store refuses a second submission for the same quiz
    Given a submission already stored for the quiz
    When a second submission for the same quiz is stored
    Then it is refused as a duplicate

  @integration
  Scenario: the store knows whether a quiz has been submitted
    Then the quiz reports no submission before one is stored
    And reports a submission after one is stored
