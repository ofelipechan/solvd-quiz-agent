Feature: Scoring rules for one question and for the whole quiz
  As the admin taking a quiz
  I want each answer scored 0-4 and the quiz scored as a weighted average of question weights
  So that the result is predictable and partial credit on multiple-answer questions counts

  # Per question: 4 for a correct single answer, 0 for a wrong one, and for a
  # multiple-answer question 4 * (correct picks - wrong picks) / correct
  # options, clamped at 0 so a wrong pick removes the credit a correct pick
  # adds and selecting everything cannot game the question. Every question
  # carries a weight, assigned
  # when the quiz is created as an equal split of 100 across the questions
  # (two decimals; the last question absorbs the rounding remainder so the
  # weights add up to exactly 100). Final score = sum(score * weight) /
  # sum(weight), kept on the same 0-4 scale as a question. The percentage
  # shown to the user is derived: finalScore / 4 * 100.

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
  Scenario: a wrong pick cancels one correct pick
    When the multiple-answer question is answered with both correct options and one wrong option
    Then the question scores 2

  @unit
  Scenario: selecting every option earns nothing when wrong picks match correct ones
    When the multiple-answer question is answered with all four options
    Then the question scores 0

  @unit
  Scenario: more wrong picks than correct picks never scores below 0
    When the multiple-answer question is answered with one correct option and two wrong options
    Then the question scores 0

  @unit
  Scenario: penalty is proportional to the number of correct options
    Given a multiple-answer question with 3 correct options out of 4
    When that question is answered with all four options
    Then the question scores 2.67

  @unit
  Scenario: selecting nothing scores 0
    When the multiple-answer question is answered with no options
    Then the question scores 0

  # ============================================================
  # Group: Question weights
  # ============================================================

  @unit
  Scenario: weights are split equally across the questions
    When weights are assigned to 5 questions
    Then every question weighs 20

  @unit
  Scenario: weights keep two decimals and the last question absorbs the rounding remainder
    When weights are assigned to 3 questions
    Then the first two questions weigh 33.33
    And the last question weighs 33.34
    And the weights add up to 100

  @unit
  Scenario: a remainder can also lower the last weight
    When weights are assigned to 7 questions
    Then the first six questions weigh 14.29
    And the last question weighs 14.26
    And the weights add up to 100

  @unit
  Scenario: assigning weights to no questions yields no weights
    When weights are assigned to 0 questions
    Then no weights are produced

  # ============================================================
  # Group: Final score
  # ============================================================

  @unit
  Scenario: the final score is a weighted average of per-question scores
    When per-question scores 4 and 0 with weights 20 and 80 are combined
    Then the final score is 0.8

  @unit
  Scenario: a heavier question moves the final score more
    When per-question scores 0 and 4 with weights 20 and 80 are combined
    Then the final score is 3.2

  @unit
  Scenario: partial credit is weighted like any other score
    When per-question scores 4 and 2 with weights 50 and 50 are combined
    Then the final score is 3

  @unit
  Scenario: a fully correct quiz keeps the maximum score
    When per-question scores 4, 4 and 4 with weights 33.33, 33.33 and 33.34 are combined
    Then the final score is 4

  @unit
  Scenario: a quiz with no questions scores 0
    When no per-question scores are combined
    Then the final score is 0

  @unit
  Scenario: mismatched scores and weights are rejected
    When 2 per-question scores are combined with 3 weights
    Then combining is rejected as invalid

  # ============================================================
  # Group: Percentage
  # ============================================================

  @unit
  Scenario: the maximum score is 100 percent
    When a final score of 4 is expressed as a percentage
    Then the percentage is 100

  @unit
  Scenario: half the maximum score is 50 percent
    When a final score of 2 is expressed as a percentage
    Then the percentage is 50

  @unit
  Scenario: the percentage keeps fractions
    When a final score of 3.5 is expressed as a percentage
    Then the percentage is 87.5
