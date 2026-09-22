Feature: LLM chat client returning structured JSON
  As the question generation strategy
  I want one call that sends role-labelled messages to the configured model and returns parsed JSON
  So that every LLM call is uniform, traced, and attributable for cost

  # Thin wrapper over the provider. Model comes from config and can be
  # overridden. Replies are requested in JSON mode by default, or against a
  # JSON schema (structured outputs) when the caller passes one. Every call is recorded as
  # a "generate-completion" generation observation carrying model, messages,
  # parsed output, token usage and, when the provider reports it, the billed
  # cost.

  Background:
    Given a provider API key and a configured model id

  # ============================================================
  # Group: Request and reply
  # ============================================================

  @unit
  Scenario: a chat is sent to the configured model asking for a JSON reply
    When a chat is sent with one user message
    Then the provider receives that message for the configured model
    And the reply is requested as a single JSON object

  @unit
  Scenario: a chat is sent with a JSON schema response format
    When a chat is sent with a JSON schema response format
    Then the provider receives that response format unchanged

  @unit
  Scenario: the parsed JSON reply is returned to the caller
    Given the provider replies with {"questions":[]}
    When a chat is sent
    Then the object {"questions":[]} is returned

  @unit
  Scenario: a system message is sent ahead of the user message unchanged
    When a chat is sent with a system message followed by a user message
    Then the provider receives both messages in that order, unchanged

  @unit
  Scenario: a custom model id overrides the configured one
    Given the client is configured with model custom/model:free
    When a chat is sent
    Then the provider receives model custom/model:free

  # ============================================================
  # Group: Tracing one LLM call
  # ============================================================

  @unit
  Scenario: the call is traced as a generation
    When a chat is sent
    Then the generate-completion observation is of type generation

  @unit
  Scenario: the trace records which model answered
    Given the client is configured with model custom/model:free
    When a chat is sent
    Then the generate-completion observation names model custom/model:free

  @unit
  Scenario: the trace records the messages sent as the generation input
    When a chat is sent with a system and a user message
    Then the generate-completion input is those role-labelled messages

  @unit
  Scenario: the trace records the parsed reply as the generation output
    Given the provider replies with {"questions":[]}
    When a chat is sent
    Then the generate-completion output is {"questions":[]}

  @unit
  Scenario: the trace records prompt, completion and total tokens
    Given the provider reports 120 prompt, 30 completion and 150 total tokens
    When a chat is sent
    Then the generate-completion usage is input 120, output 30, total 150

  @unit
  Scenario: the trace records the billed cost when the provider reports one
    Given the provider reports cost 0.00042
    When a chat is sent
    Then the generate-completion cost total is 0.00042

  @unit
  Scenario: the trace carries no cost when the provider reports none
    Given the provider reports usage without a cost
    When a chat is sent
    Then the generate-completion observation has no cost details

  @unit
  Scenario: the trace records that a JSON reply was requested
    When a chat is sent
    Then the generate-completion model parameters show a JSON object response format

  @unit
  Scenario: the trace records that a JSON schema reply was requested
    When a chat is sent with a JSON schema response format
    Then the generate-completion model parameters show a JSON schema response format

  @unit
  Scenario: a reply that is not JSON fails the call and marks the generation as errored
    Given the provider replies with the text "not json"
    When a chat is sent
    Then the call fails because the reply could not be parsed
    And the generate-completion observation status is error

  @unit
  Scenario: the raw reply is kept as output when it cannot be parsed
    Given the provider replies with the text "not json"
    When a chat is sent and fails
    Then the generate-completion output is the raw text "not json"
