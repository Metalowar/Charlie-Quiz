---
description: Пройти реєстраційний квіз живим браузером двічі й оновити variant1/result.md
argument-hint: "[URL квізу — необовʼязково]"
allowed-tools: Read, Glob, Write, Task, mcp__playwright__*
---

Запусти агента **quiz-test**. Його визначення — `variant1/.claude/agents/quiz-test.md`.

URL квізу: `$1`. Якщо порожньо — агент бере його з `tests/config/routes.ts`
(`BASE_URL` + `ROUTES.QUIZ_START`).

Якщо субагент `quiz-test` не зареєстрований у цій сесії — прочитай
`variant1/.claude/agents/quiz-test.md` і виконай ці інструкції сам, обмежившись
інструментами з його frontmatter `tools:` і його ж guardrails.
