Feature: Question generation strategy and the generated-quiz contract
  As the quiz agent
  I want the LLM's reply validated against a strict quiz contract, with one retry
  So that a malformed generation never becomes a persisted quiz

  # The default strategy sends generator instructions plus the Markdown to the
  # LLM, asks for JSON, validates the reply against the shared quiz contract,
  # and retries exactly once on a contract failure. The contract is shared
  # between api and web. Spec: GEN-01, GEN-02, GEN-06.

  # ============================================================
  # Group: Generated quiz contract
  # ============================================================

  @unit
  Scenario: a quiz with 5 well-formed questions is accepted
    Given a quiz with 5 distinct questions, each with exactly 4 options
    And every single-answer question has exactly one correct option
    When the generated quiz is validated
    Then it is accepted

  @unit
  Scenario: a question with only 3 options is rejected
    Given a quiz where one question has 3 options
    When the generated quiz is validated
    Then it is rejected

  @unit
  Scenario: a single-answer question with 2 correct options is rejected
    Given a quiz where a single-answer question marks 2 options correct
    When the generated quiz is validated
    Then it is rejected

  @unit
  Scenario: a multiple-answer question with only 1 correct option is rejected
    Given a quiz where a multiple-answer question marks only 1 option correct
    When the generated quiz is validated
    Then it is rejected

  @unit
  Scenario: a question with duplicate option text is rejected
    Given a quiz where one question has two options with the same text
    When the generated quiz is validated
    Then it is rejected

  @unit
  Scenario: a quiz with fewer than 5 questions is rejected
    Given a quiz with 4 questions
    When the generated quiz is validated
    Then it is rejected

  @unit
  Scenario: a quiz with more than 8 questions is rejected
    Given a quiz with 9 questions
    When the generated quiz is validated
    Then it is rejected

  # ============================================================
  # Group: Prompt shape
  # ============================================================

  @unit
  Scenario: generator instructions are sent separately from the document
    When questions are generated from a document
    Then the LLM receives the generator instructions as a system message
    And the document message does not contain those instructions

  @unit
  Scenario: the document text is sent to the LLM verbatim
    When questions are generated from a document
    Then the LLM's user message contains the document text verbatim

  # ============================================================
  # Group: Validation and retry
  # ============================================================

  @unit
  Scenario: a valid first reply is returned without a retry
    Given the LLM's first reply is a valid quiz
    When questions are generated
    Then that quiz is returned
    And the LLM was asked exactly once

  @unit
  Scenario: an invalid first reply is retried exactly once
    Given the LLM's first reply breaks the contract and its second reply is valid
    When questions are generated
    Then the valid quiz is returned
    And the LLM was asked exactly twice

  @unit
  Scenario: two invalid replies fail the generation with no third attempt
    Given the LLM's first and second replies both break the contract
    When questions are generated
    Then generation is rejected as failed
    And the LLM was asked exactly twice

  # ============================================================
  # Group: Tracing one generation run
  # ============================================================

  @unit
  Scenario: the run is traced as a chain
    When questions are generated
    Then the generate-questions observation is of type chain

  @unit
  Scenario: the LLM call is nested under the generation run
    When questions are generated through the real LLM client
    Then the generate-completion observation is a child of generate-questions

  @unit
  Scenario: the validated quiz is the run's output
    When questions are generated
    Then the generate-questions output is the validated quiz

  @unit
  Scenario: a clean first reply is recorded as one attempt
    Given the LLM's first reply is valid
    When questions are generated
    Then the generate-questions metadata records 1 attempt

  @unit
  Scenario: a retry is recorded as two attempts
    Given the LLM's first reply breaks the contract and its second reply is valid
    When questions are generated
    Then the generate-questions metadata records 2 attempts

  @unit
  Scenario: a recovered contract failure is flagged as a warning
    Given the LLM's first reply breaks the contract and its second reply is valid
    When questions are generated
    Then the generate-questions observation level is WARNING

  @unit
  Scenario: the contract issues of the failed attempt are kept in the trace
    Given the LLM's first reply breaks the contract and its second reply is valid
    When questions are generated
    Then the generate-questions metadata names the failing field

  @unit
  Scenario: the run is marked as errored when both attempts fail
    Given the LLM's first and second replies both break the contract
    When questions are generated
    Then the generate-questions observation status is error
