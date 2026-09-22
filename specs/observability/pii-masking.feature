Feature: Mask PII and secrets before traces leave the process
  As the operator reading traces
  I want e-mails, API keys and bearer tokens redacted from every exported value
  So that traces stay useful without ever carrying personal data or credentials

  # Applied to every string value before export. Non-string values pass
  # through untouched. Ordinary quiz content is left as is.

  @unit
  Scenario: e-mail addresses are redacted
    When the traced text contains jane.doe+dev@example.co.uk
    Then the exported text has [EMAIL_REDACTED] in its place

  @unit
  Scenario: API-key-like tokens are redacted
    When the traced text contains provider-style keys starting sk- or pk-
    Then each key is replaced by [SECRET_REDACTED]

  @unit
  Scenario: bearer tokens are redacted
    When the traced text contains "Authorization: Bearer <token>"
    Then the token after Bearer is replaced by [SECRET_REDACTED]

  @unit
  Scenario: text without sensitive data is exported unchanged
    When the traced text is ordinary quiz JSON
    Then the exported text is identical

  @unit
  Scenario: non-string values are exported unchanged
    When the traced value is the number 42
    Then 42 is exported unchanged
