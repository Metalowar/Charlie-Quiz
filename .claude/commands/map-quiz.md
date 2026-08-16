---
description: Re-map the Charlie registration quiz's step structure via the quiz-structure-mapper agent
---

Invoke the `quiz-structure-mapper` subagent to walk the live Charlie registration quiz on staging, mock the account-creation and lesson-booking endpoints, classify the current steps, and update `tests/quiz-structure/schema.json`.
