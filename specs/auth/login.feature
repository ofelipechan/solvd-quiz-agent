Feature: Admin sign-in, sign-out and protected access
  As the single seeded admin
  I want to sign in once and have every quiz action trust that session
  So that quizzes, submissions and scores are never reachable anonymously

  # One user only (admin@solvd.com / solvdAdmin), seeded by script, password
  # stored hashed. The session lives in a browser-only cookie that expires
  # after 24h. Spec: .specs/features/quiz-agent/spec.md AUTH-01..05.

  Background:
    Given the admin user admin@solvd.com exists with password solvdAdmin

  # ============================================================
  # Group: Signing in
  # ============================================================

  @integration
  Scenario: signing in with valid credentials starts a browser-only session
    When the admin signs in with the correct email and password
    Then the sign-in succeeds
    And a session cookie is set that scripts cannot read

  @integration
  Scenario: signing in with a wrong password is rejected without a session
    When the admin signs in with the correct email and a wrong password
    Then the sign-in is rejected as unauthenticated
    And no session cookie is set

  @integration
  Scenario: the seeded admin can sign in against a real database
    Given the seed script has run against a real database
    When the admin signs in with the seeded email and password
    Then the sign-in succeeds

  @unit
  Scenario: correct credentials produce a session token for the admin
    When the admin signs in with the correct password
    Then a session token is issued
    And the token identifies the admin's user id

  @unit
  Scenario: a wrong password is rejected as invalid credentials
    When the admin signs in with a wrong password
    Then sign-in is rejected as invalid credentials

  @unit
  Scenario: an unknown email is rejected exactly like a wrong password
    When someone signs in with an email that has no user
    Then sign-in is rejected with the same invalid-credentials outcome as a wrong password
    # No user-enumeration leak: unknown email and wrong password are indistinguishable.

  # ============================================================
  # Group: Signing out
  # ============================================================

  @integration
  Scenario: signing out ends the session
    When the admin signs out
    Then the sign-out succeeds
    And the session cookie is cleared

  # ============================================================
  # Group: Protected access
  # ============================================================

  @integration
  Scenario: a protected action without a session is rejected
    When a protected action is requested without a session
    Then the request is rejected as unauthenticated

  @integration
  Scenario: a protected action with an expired session is rejected
    Given a session that has already expired
    When a protected action is requested with that session
    Then the request is rejected as unauthenticated

  @integration
  Scenario: a protected action with a valid session is allowed
    Given a session valid for 24h
    When a protected action is requested with that session
    Then the request succeeds

  @unit
  Scenario: an expired session token yields no user
    When an expired session token is checked
    Then no user is resolved

  @unit
  Scenario: a valid session token yields its user id
    When a valid, unexpired session token is checked
    Then the user id inside it is resolved

  # ============================================================
  # Group: Admin seed (AUTH-04)
  # ============================================================

  @integration
  Scenario: seeding the admin twice leaves exactly one admin row
    When the admin seed runs twice against the same database
    Then exactly one row exists for admin@solvd.com

  @integration
  Scenario: the seeded password is stored hashed, never in plaintext
    When the admin seed has run
    Then the stored password is not the plaintext solvdAdmin
    And the stored hash verifies against solvdAdmin
