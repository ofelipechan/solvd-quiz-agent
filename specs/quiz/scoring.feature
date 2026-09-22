Feature: Scoring rules for one question and for the whole quiz
  As the admin taking a quiz
  I want each answer scored 0-4 and the quiz scored as a weighted average
  So that the result is predictable and partial credit on multiple-answer questions counts

  # Per question: 4 for a correct single answer, 0 for a wrong one, and for a
  # multiple-answer question 4 * (correct picks / correct options) with no
  # penalty for extra wrong picks. Final score = weighted average of
  # per-question scores on a 0-4 scale. The first question has weight 1.0;
  # each subsequent question's weight is 10% greater than the previous one.

  Background:
    Given a single-answer question with 1 correct option out of 4
    And a multiple-answer question with 2 correct options out of 4

  # ============================================================
  # Group: Per-question score
  # ============================================================

  @unit
  Scenario: the correct single answer scores 4
    When the single-answer question is answered with its correct option
    Then the question scores 4

  @unit
  Scenario: a wrong single answer scores 0
    When the single-answer question is answered with a wrong option
    Then the question scores 0

  @unit
  Scenario: selecting every correct option scores 4
    When the multiple-answer question is answered with both correct options
    Then the question scores 4

  @unit
  Scenario: selecting some of the correct options earns partial credit
    When the multiple-answer question is answered with one of its two correct options
    Then the question scores 2

  @unit
  Scenario: an extra wrong pick is not penalized
    When the multiple-answer question is answered with both correct options and one wrong option
    Then the question scores 4

  @unit
  Scenario: selecting nothing scores 0
    When the multiple-answer question is answered with no options
    Then the question scores 0

  # ============================================================
  # Group: Final score
  # ============================================================

  @unit
  Scenario: the final score is a weighted average of per-question scores
    When per-question scores 4 and 0 are combined
    Then the final score is approximately 1.9048

  @unit
  Scenario: each later question weighs 10 percent more than the previous one
    When per-question scores 0 and 4 are combined
    Then the final score is approximately 2.0952

  @unit
  Scenario: a fully correct quiz keeps the maximum score
    When per-question scores 4, 4 and 4 are combined
    Then the final score is 4

  @unit
  Scenario: a quiz with no questions scores 0
    When no per-question scores are combined
    Then the final score is 0
