Feature: New quiz page
  As the admin
  I want to paste a Markdown URL and get a quiz generated
  So that I can start a quiz without leaving the browser

  # Field: "Markdown document URL". Button: "Generate quiz" -> "Generating quiz"
  # (disabled) while generation is in flight. Success opens the new quiz.
  # Failure shows the server message in an alert and keeps the URL in the
  # field. Spec: UI-03, UI-05.

  @integration
  Scenario: generating shows a busy state and then opens the new quiz
    Given quiz generation will take a while and then succeed with id quiz-1
    When the admin fills the Markdown document URL and presses "Generate quiz"
    Then the button reads "Generating quiz" and cannot be pressed while generation is in flight
    And when generation completes the admin is taken to quiz quiz-1

  @integration
  Scenario: the busy button cycles through progress labels while generation is pending
    Given quiz generation stays pending
    When the admin presses "Generate quiz"
    Then the busy button reads "Generating quiz"
    And every 5 seconds its label advances through "Downloading document", "Reading document", "Generating questions", "Thinking" and back to "Generating quiz"
    # Added 2026-09-13 with its (still red) test - the page does not cycle labels yet.

  @integration
  Scenario: a generation failure shows the server message and keeps the URL
    Given quiz generation will be rejected with "source too large"
    When the admin fills the Markdown document URL and presses "Generate quiz"
    Then an alert reading "source too large" is shown
    And the URL field still holds the entered URL
    And the admin stays on the page

  @unimplemented @integration
  Scenario: a submission failure shows the server message and allows retry
    Given the quiz was generated and answered
    And submitting the answers will fail
    When the admin presses "Submit answers"
    Then an alert with the server message is shown
    And the answers stay selected so the admin can retry
    # UI-05 covers submission failure too; only generation failure has a test today.
