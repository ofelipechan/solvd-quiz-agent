Feature: App shell - navbar and hero backdrop
  As the admin using the app
  I want the navbar to show where I am and let me sign out, and the backdrop to respect my motion preference
  So that navigation is always clear and the shell never traps me

  # Navbar links: "New quiz", "History"; button "Sign out". Sign-out ends the
  # server session, clears the local session and returns to the login screen -
  # even when the server call fails. Backdrop: two muted inline videos, the
  # second one lazy, looping from a settled point, nothing rendered when the
  # user prefers reduced motion.

  # ============================================================
  # Group: Navbar
  # ============================================================

  @integration
  Scenario: the current section is marked in the navbar
    When the navbar is shown on the history page
    Then the History link is marked as the current page
    And the New quiz link is not

  @integration
  Scenario: signing out from the navbar ends the session
    Given the admin is signed in
    When "Sign out" is pressed and the server sign-out succeeds
    Then the local session is cleared
    And the server sign-out was requested once

  @integration
  Scenario: the local session is cleared even when the server sign-out fails
    Given the admin is signed in
    When "Sign out" is pressed and the server sign-out fails
    Then the local session is still cleared

  # ============================================================
  # Group: Particle backdrop
  # ============================================================

  @integration
  Scenario: the backdrop shows two muted inline videos
    When the backdrop is shown
    Then two videos are present
    And each is muted and plays inline

  @integration
  Scenario: the second video loads only once the first can play through
    When the backdrop is shown
    Then the second video has no source
    And once the first video can play through the second gets its source

  @integration
  Scenario: a finished video restarts from the loop point
    When a backdrop video ends
    Then its playback position is set to the loop start

  @integration
  Scenario: the backdrop shows nothing when the user prefers reduced motion
    Given the user prefers reduced motion
    When the backdrop is shown
    Then no video is present
