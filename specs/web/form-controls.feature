Feature: Shared form controls - button, text field, checkbox, radio
  As every page in the app
  I want the shared controls to keep native semantics and accessible states
  So that forms work with keyboards, screen readers and double-submit protection

  # Button: loading disables it and announces busy, never submits a form by
  # accident, becomes a link when given a destination, decorative arrow hidden
  # from assistive tech. Text field: label association, error announced and
  # linked. Checkbox / radio: native inputs, disabled blocks toggling, radios
  # group by name.

  # ============================================================
  # Group: Button
  # ============================================================

  @integration
  Scenario: a loading button cannot be pressed and announces it is busy
    When a button is shown in its loading state
    Then it cannot be pressed
    And it announces itself as busy

  @integration
  Scenario: pressing a loading button does nothing
    When a loading button is pressed
    Then its action does not run

  @integration
  Scenario: a button inside a form does not submit it by default
    When a button is shown without an explicit purpose
    Then pressing it does not submit a surrounding form

  @integration
  Scenario: a button with a destination behaves as a link
    When a button is shown with the destination /quizzes/new
    Then a link named by the button text points to /quizzes/new

  @integration
  Scenario: the decorative arrow is hidden from assistive tech and can be turned off
    When a button is shown by default
    Then it contains a decoration hidden from assistive tech
    And with the arrow turned off it contains none

  # ============================================================
  # Group: Text field
  # ============================================================

  @integration
  Scenario: the label is tied to the field
    When a text field is shown with the label Email
    Then the field is reachable by the label text Email

  @integration
  Scenario: an error is announced and linked to the field
    When a text field is shown with an error message
    Then the field is marked invalid
    And the field is described by the message

  @integration
  Scenario: a field without an error is not marked invalid
    When a text field is shown without an error
    Then the field is not marked invalid

  @integration
  Scenario: typing into the field updates its value
    When the user types https://a.md into a text field
    Then the field holds https://a.md

  # ============================================================
  # Group: Checkbox and radio
  # ============================================================

  @integration
  Scenario: a checkbox toggles when pressed
    When a checkbox is pressed
    Then its change is reported exactly once

  @integration
  Scenario: a disabled checkbox does not toggle
    When a disabled checkbox is pressed
    Then no change is reported

  @integration
  Scenario: radios sharing a name are mutually exclusive
    Given two radios sharing the same name
    When the second is pressed
    Then the second is selected and the first is not
