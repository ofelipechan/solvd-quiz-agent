Feature: End-to-end quiz flow
  As the admin
  I want to sign in, generate a quiz from a real README, answer it and see my score
  So that the whole stack is proven to work together against a live LLM

  # The one stable smoke path. Runs against the real app, a disposable seeded
  # database and the real LLM, so it is slow (45s generation budget) and not
  # part of the per-change suite.

  @e2e
  Scenario: sign in, generate a quiz, answer it, submit, and see a score
    Given the seeded admin credentials
    When the admin signs in
    Then the new-quiz screen is shown
    When the admin generates a quiz from a public README URL
    Then the new quiz opens within 45 seconds
    And between 5 and 8 questions are shown
    When the admin picks the first option of every question and presses "Submit answers"
    Then "Final score:" followed by a number is visible within 15 seconds
