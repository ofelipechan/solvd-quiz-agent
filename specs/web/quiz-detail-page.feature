Feature: Quiz page - answer, submit and review
  As the admin
  I want the quiz page to render the questions as radios or checkboxes, take my answers, and show the result
  So that one page covers taking a quiz and reviewing a finished one

  # Loads the quiz named in the address. Single-answer -> radios, multiple
  # -> checkboxes. Button "Submit answers". After submit (or when the quiz was
  # already submitted): per-question correctness, the correct option marked
  # with a check mark, each question's weight, "Final score: N.N%" (derived
  # from the 0-4 score: 4 -> 100.0%), inputs locked, no submit button. Every
  # option the admin picked also shows the feedback explaining why it was
  # right or wrong. Weights and feedback are hidden while answering.
  # Unknown quiz -> "quiz not found".
  # Spec: UI-03, UI-04, HIST-02, HIST-03, SCORE-05.

  # ============================================================
  # Group: Loading and rendering
  # ============================================================

  @integration
  Scenario: the page loads the quiz named in the address
    Given the address names quiz quiz-1
    When the page opens
    Then quiz quiz-1 is loaded

  @integration
  Scenario: a single-answer question is shown as radios
    Given the quiz has one single-answer question with 2 options
    When the page opens
    Then 2 radios are shown

  @integration
  Scenario: a multiple-answer question is shown as checkboxes
    Given the quiz has one multiple-answer question with 3 options
    When the page opens
    Then 3 checkboxes are shown

  @integration
  Scenario: an unknown quiz shows a not-found message
    Given the quiz cannot be found
    When the page opens
    Then the text "quiz not found" is shown

  # ============================================================
  # Group: Submit and review
  # ============================================================

  @integration
  Scenario: submitting shows per-question correctness and the final score
    Given the quiz has one single-answer question and submitting will score it 4
    When the admin picks the correct option and presses "Submit answers"
    Then the question is marked correct with a check mark on the correct option
    And "Final score: 100.0%" is shown

  @integration
  Scenario: the final score is shown as a percentage with one decimal
    Given the quiz was already submitted with finalScore 3.5
    When the page opens
    Then "Final score: 87.5%" is shown

  @integration
  Scenario: the results explain how the final score is weighted
    Given the quiz was already submitted
    When the page opens
    Then the results explain that the final score is a weighted average of the question weights
    And the results do not claim that each question is worth 10 percent more than the previous one

  @integration
  Scenario: each reviewed question shows its weight
    Given the quiz was already submitted and its question weighs 20
    When the page opens
    Then "Weight: 20%" is shown on that question

  @integration
  Scenario: reviewing explains every option the admin picked
    Given the quiz was already submitted and the admin's pick is explained as wrong
    When the page opens
    Then that explanation is shown under the option the admin picked

  @integration
  Scenario: an option the admin did not pick is not explained
    Given the quiz was already submitted and only one of two options was picked
    When the page opens
    Then no explanation is shown under the option the admin left alone

  @integration
  Scenario: no explanation is shown while answering
    Given the quiz has not been submitted
    When the page opens
    Then no explanation is shown on any option

  @integration
  Scenario: weights are hidden while answering
    Given the quiz has not been submitted and its question weighs 20
    When the page opens
    Then no weight is shown

  @integration
  Scenario: an already-submitted quiz opens in review mode
    Given the quiz was already submitted with finalScore 4
    When the page opens
    Then the admin's selection is pre-checked and every input is locked
    And the correct option is marked with a check mark
    And "Final score: 100.0%" is shown
    And there is no "Submit answers" button
