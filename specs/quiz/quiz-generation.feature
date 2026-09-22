Feature: Generate a quiz from a Markdown URL
  As the admin
  I want to submit a Markdown URL and get back a persisted 5-8 question quiz
  So that any public README becomes a scored test in one step

  # The flow is fetch -> generate -> persist; a failure at any step stops the
  # flow and nothing partial is stored. Correct answers are never exposed when
  # a quiz is created (GEN-07). Before persisting, every question receives a
  # weight: an equal split of 100 across the questions (see scoring.feature). The strategy that turns Markdown into
  # questions is specified in question-generation-strategy.feature. Every
  # option is generated with a feedback explaining why it is right or wrong;
  # like correctness, that feedback is part of the answer key and is withheld
  # until the quiz is submitted (GEN-07).

  Background:
    Given the admin is signed in with a valid session

  # ============================================================
  # Group: Creating a quiz
  # ============================================================

  @integration
  Scenario: a created quiz is returned with its questions but without the answers
    When the admin creates a quiz from a Markdown URL
    Then the quiz is created
    And the questions and their options are returned
    And each question carries its weight
    And no option reveals whether it is correct
    And no option reveals its feedback

  @integration
  Scenario: quiz creation is rejected when the source cannot be fetched
    Given the source URL cannot be fetched
    When the admin creates a quiz from that URL
    Then creation is rejected because the source could not be processed

  @integration
  Scenario: quiz creation is rejected when the source is too large
    Given the source document is larger than 200KB
    When the admin creates a quiz from that URL
    Then creation is rejected because the source could not be processed

  @integration
  Scenario: quiz creation fails when question generation fails
    Given question generation fails after its retry
    When the admin creates a quiz from a Markdown URL
    Then creation fails because the generator did not produce a quiz

  @integration
  Scenario: quiz creation without a session is rejected
    Given no session
    When a quiz is created from a Markdown URL
    Then the request is rejected as unauthenticated
    And no quiz is generated

  @unimplemented @integration
  Scenario: a fetch failure names what went wrong
    Given the source URL cannot be retrieved or is not text
    When the admin creates a quiz from that URL
    Then the rejection message names which of the two failed
    # GEN-04 asserts the message; the route test today asserts the outcome only.

  # ============================================================
  # Group: Create flow - fetch, generate, persist
  # ============================================================

  @unit
  Scenario: questions are generated against the quiz response schema
    When a quiz is created
    Then generation is asked for the generated-quiz JSON schema response format

  @unit
  Scenario: a quiz is created by fetching, generating, then persisting
    When a quiz is created from a source URL
    Then the source is fetched before questions are generated
    And questions are generated before the quiz is persisted
    And the persisted quiz with its questions and options is returned

  @unit
  Scenario: every generated question is persisted with an equal-split weight
    Given generation produces 3 questions
    When a quiz is created from a source URL
    Then the questions are persisted with weights 33.33, 33.33 and 33.34
    And the weights add up to 100

  @unit
  Scenario: every generated option is persisted with its feedback
    Given generation produces options that each explain why they are right or wrong
    When a quiz is created from a source URL
    Then each option is persisted with the feedback it was generated with

  @unit
  Scenario: a fetch failure stops the flow before generation
    Given fetching the source fails
    When a quiz is created from that source URL
    Then the failure is surfaced unchanged
    And no questions are generated
    And nothing is persisted

  @unit
  Scenario: a generation failure stops the flow before persistence
    Given question generation fails
    When a quiz is created from a source URL
    Then the failure is surfaced unchanged
    And nothing is persisted

  @unit
  Scenario: a source under 200 characters is rejected as insufficient content
    Given the fetched source has fewer than 200 characters
    When a quiz is created from that source URL
    Then creation is rejected as insufficient content
    And no questions are generated
    And nothing is persisted

  # ============================================================
  # Group: Tracing one quiz creation
  # ============================================================

  @unit
  Scenario: a quiz creation is one trace rooted in create-quiz
    When a quiz is created
    Then the trace has a create-quiz observation with no parent

  @unit
  Scenario: the root input is the source URL
    When a quiz is created from a source URL
    Then the create-quiz input is that source URL and nothing else

  @unit
  Scenario: the root output identifies the quiz and its size
    When a quiz is created
    Then the create-quiz output is the quiz id and the question count

  @unit
  Scenario: fetching the source is traced as a retriever
    When a quiz is created
    Then the fetch-source observation is of type retriever

  @unit
  Scenario: the retriever reports what was fetched and how much
    When a quiz is created
    Then the fetch-source output is the source URL and the content length
    And the document itself is not duplicated into the trace

  @unit
  Scenario: persisting is traced as its own step
    When a quiz is created
    Then the persist-quiz output is the quiz id

  @unit
  Scenario: fetch and persist steps nest under the root
    When a quiz is created
    Then fetch-source and persist-quiz are children of create-quiz

  @unit
  Scenario: a fetch failure marks the root as errored with the reason
    Given fetching the source fails with a reason
    When a quiz is created
    Then the create-quiz observation status is error with that reason as its message

  @unit
  Scenario: a generation failure leaves no persist step in the trace
    Given question generation fails
    When a quiz is created
    Then the trace has no persist-quiz observation

  @unit
  Scenario: insufficient content marks the root as errored
    Given the fetched source has fewer than 200 characters
    When a quiz is created
    Then the create-quiz observation status is error
