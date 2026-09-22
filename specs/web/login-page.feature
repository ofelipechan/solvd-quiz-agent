Feature: Login page
  As the admin
  I want to sign in with email and password
  So that I land on the quiz-creation screen, or see why I could not

  # Fields: Email, Password. Button: "Sign in". Success takes the admin to
  # the new-quiz screen. Failure shows an inline alert and stays put.
  # Spec: UI-01, UI-02.

  @integration
  Scenario: a successful sign-in takes the admin to the new-quiz screen
    Given the sign-in will succeed
    When the admin fills Email and Password and presses "Sign in"
    Then the admin is taken to the new-quiz screen

  @integration
  Scenario: a failed sign-in shows an inline error and stays on the page
    Given the sign-in will be rejected as unauthenticated
    When the admin fills Email and a wrong Password and presses "Sign in"
    Then an alert reading "invalid credentials" is shown
    And the admin stays on the login page
