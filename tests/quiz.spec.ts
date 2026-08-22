import { test, expect } from '@playwright/test';
import { QuizPage } from './page-objects/quizPage';

const MAX_STEPS = 50; // запобіжник від зависання, якщо якийсь крок не розпізнається / не веде далі

test('Positive flow. All steps have valid data', async ({ page }) => {
  let userCreated = false;
  let lessonBooked = false;

  await page.route('**/api/v1/users', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    userCreated = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ "included": [
          {
            "type": "user-meta",
            "id": "822549" 
          }
        ],
          "data": {
              "type": "users",
              "id": "853922"
        }
      }),
    });
  });

  await page.route('**/api/v1/lessons', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    lessonBooked = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ "id": "822549" }),
    });
  });

  const quiz = new QuizPage(page);
  await quiz.open();

  let steps = 0;
  while (!(await quiz.isQuizFinished())) {
    await quiz.completeCurrentStep();

    steps++;
    expect(steps, 'Quiz didnt finish after max steps').toBeLessThan(MAX_STEPS);
  }

  expect(userCreated, 'POST /api/v1/users should called (mock)').toBe(true);
  expect(lessonBooked, 'POST /api/v1/lessons should called (mock)').toBe(true);
});
