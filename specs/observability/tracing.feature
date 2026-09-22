Feature: Request trace context and tracing environment
  As the operator reading traces
  I want every trace tied to the signed-in user and the handling route, labelled by environment
  So that per-user filtering, cost attribution and prod/dev separation work

  # A request's work is wrapped so every observation created inside carries
  # the user id and the route pattern. The tracing environment is the explicit
  # tracing label if set, else the runtime environment, else development.

  # ============================================================
  # Group: Request trace context
  # ============================================================

  @unit
  Scenario: observations inside a request are attributed to the signed-in user
    Given a request from user user-42
    When traced work runs inside that request's context
    Then every observation is attributed to user user-42

  @unit
  Scenario: observations inside a request record the handling route
    Given a request handled by the quiz-creation route
    When traced work runs inside that request's context
    Then the trace records that route pattern

  @unit
  Scenario: an anonymous request is traced without a user
    Given an unauthenticated request
    When traced work runs inside that request's context
    Then the observation is attributed to no user
    And the work still completes

  # ============================================================
  # Group: Tracing environment
  # ============================================================

  @unit
  Scenario: an explicit tracing label wins over the runtime environment
    Given the tracing label is staging and the runtime environment is production
    Then the tracing environment is staging

  @unit
  Scenario: the runtime environment is used when no tracing label is set
    Given only the runtime environment is set to production
    Then the tracing environment is production

  @unit
  Scenario: development is the default when nothing is set
    Given neither value is set
    Then the tracing environment is development

  @unit
  Scenario: blank values count as unset
    Given the tracing label is whitespace and the runtime environment is empty
    Then the tracing environment is development
