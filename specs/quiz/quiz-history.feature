Feature: Quiz history and quiz detail
  As the admin
  I want to list past quizzes with their scores and open any one of them
  So that I can compare runs across README sources and review a finished quiz

  # The list shows summaries (final score empty until submitted). A quiz
  # detail carries the question tree with correctness hidden, plus a
  # submission block (empty when unsubmitted) that is the only place correct
  # option ids are revealed. Spec: HIST-01..03.

  Background:
    Given the admin is signed in with a valid session

  # ============================================================
  # Group: Listing quizzes
  # ============================================================

  @integration
  Scenario: the list shows each quiz with its score or no score yet
    Given two quizzes exist, one submitted with finalScore 3.5 and one unsubmitted
    When the admin lists the quizzes
    Then 2 entries are returned
    And the submitted entry has finalScore 3.5
    And the unsubmitted entry has no finalScore

  @integration
  Scenario: listing quizzes without a session is rejected
    Given no session
    When the quizzes are listed
    Then the request is rejected as unauthenticated

  @integration
  Scenario: stored summaries carry the final score once submitted
    Given a submitted quiz and an unsubmitted quiz in the store
    When quiz summaries are listed
    Then the submitted quiz carries its finalScore
    And the unsubmitted quiz carries no finalScore

  # ============================================================
  # Group: Opening one quiz
  # ============================================================

  @integration
  Scenario: an unsubmitted quiz opens with its questions and no submission
    When the admin opens an unsubmitted quiz
    Then the quiz detail is returned with its id
    And there is no submission
    And no option reveals whether it is correct

  @integration
  Scenario: opening an unknown quiz is rejected as not found
    When the admin opens a quiz id that does not exist
    Then the request is rejected as not found

  @integration
  Scenario: opening a quiz without a session is rejected
    Given no session
    When a quiz is opened
    Then the request is rejected as unauthenticated

  @unit
  Scenario: an unsubmitted quiz detail hides correctness and has no submission
    Given the quiz has no submission
    When the quiz detail is loaded
    Then the detail carries the quiz id
    And there is no submission
    And no option reveals whether it is correct

  @unit
  Scenario: a submitted quiz detail reveals per-question correctness in the submission
    Given the quiz has a submission with finalScore 4
    When the quiz detail is loaded
    Then the submission carries finalScore, submittedAt and answers
    And each answer carries selectedOptionIds, score, correct and correctOptionIds
    And no option outside the submission reveals whether it is correct

  @unit
  Scenario: loading the detail of an unknown quiz is rejected as not found
    When the quiz detail is loaded for an id that does not exist
    Then the request is rejected as not found

  @unit
  Scenario: a quiz loaded for scoring carries its full question tree
    When a quiz is loaded for submission by its id
    Then its questions and options, including correctness, are returned

  @unit
  Scenario: loading an unknown quiz for scoring is rejected as not found
    When a quiz is loaded for submission with an id that does not exist
    Then the request is rejected as not found

  # ============================================================
  # Group: Persisted quiz tree
  # ============================================================

  @integration
  Scenario: a quiz is stored with its questions and options atomically
    When a quiz with 2 questions of 4 options is stored
    Then reading it back returns the source URL, both questions in order, and 4 options each

  @integration
  Scenario: a stored quiz is read back with its full question and option tree
    Given a stored quiz whose multiple-answer question has correct options a and b
    When the quiz is read back by id
    Then the correct options of that question are exactly a and b

  @integration
  Scenario: reading back an unknown quiz id yields nothing
    When a quiz is read back with an id that does not exist
    Then nothing is returned

  @integration
  Scenario: a stored submission is read back with its answers, and nothing before it exists
    Given a stored quiz with no submission
    Then reading its submission returns nothing
    When a submission with per-question scores 4 and 2.5 and finalScore 3.25 is stored
    Then reading its submission returns finalScore 3.25 and 2 answers
    And each answer carries the selectedOptionIds and score that were stored
