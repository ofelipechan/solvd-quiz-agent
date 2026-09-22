Feature: Quiz history page
  As the admin
  I want the history to list every past quiz with its score and a link into it
  So that I can compare runs and pick up an unfinished quiz

  # Each row: source URL, created date, "Score: N.N%" (finalScore / 4 * 100, one
  # decimal) or "Not yet submitted",
  # and a link - "Take quiz" when unsubmitted, "View results" when submitted.
  # Stats header aggregates total, submitted count and mean score, shown as a
  # percentage the same way. Spec: HIST-01..03.

  @integration
  Scenario: each quiz shows its score or that it is not yet submitted
    Given the history holds quiz-1 with finalScore 3.5 and quiz-2 with no finalScore
    When the page opens
    Then "Score: 87.5%" is shown for quiz-1
    And "Not yet submitted" is shown for quiz-2

  @integration
  Scenario: the average score is shown as a percentage
    Given the history holds quiz-1 with finalScore 3.5 and quiz-2 with finalScore 2.5
    When the page opens
    Then the average score reads "75.0%"

  @integration
  Scenario: unsubmitted quizzes link to take them and submitted ones to view results
    Given the history holds quiz-1 submitted and quiz-2 unsubmitted
    When the page opens
    Then the "View results" link opens quiz-1
    And the "Take quiz" link opens quiz-2

  @unit
  Scenario: history stats count every quiz, the submitted ones, and their mean score
    Given quizzes with finalScore 3, 5 and none
    When the history stats are computed
    Then total is 3, submitted is 2 and the average score is 4

  @unit
  Scenario: history stats have no average when nothing was submitted
    Given no quizzes
    When the history stats are computed
    Then total is 0, submitted is 0 and there is no average score
