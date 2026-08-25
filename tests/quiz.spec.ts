import { test, expect } from '@playwright/test';
import { QuizPage } from './page-objects/quizPage';

const MAX_STEPS = 50; // запобіжник від зависання, якщо якийсь крок не розпізнається / не веде далі

test('Positive flow. All steps have valid data', async ({ page }) => {
  let userCreatedStatus: number | null = null;
  let lessonBookedStatus: number | null = null;

  // Тест вважається пройденим, якщо отримую 200 по запитах на реєстрацію учасника
  // І на запит бронювання пробнго уроку
  page.on('response', (response) => {
    if (response.request().method() !== 'POST') return;

    const path = new URL(response.url()).pathname;

    if (path.endsWith('/api/v1/users')) {
      userCreatedStatus = response.status();
    }
    if (path.endsWith('/api/v1/lessons')) {
      lessonBookedStatus = response.status();
    }
  });

  const quiz = new QuizPage(page);
  console.log('Test user:', quiz.testUser);

  await test.step('Реєстрація: пройти квіз до кінця', async () => {
    await quiz.open();

    let steps = 0;
    while (!(await quiz.isQuizFinished())) {
      await quiz.completeCurrentStep();

      steps++;
      expect(steps, 'Quiz didnt finish after max steps').toBeLessThan(MAX_STEPS);
    }
  });

  // Якщо бронювання вже відбулось одним із кроків квізу — окрема сторінка не потрібна.
  if (lessonBookedStatus === null) {
    await test.step('Бронювання пробного уроку окремою сторінкою', async () => {
      await quiz.openBooking();
      lessonBookedStatus = await quiz.bookLesson();
    });
  }

  expect(userCreatedStatus, 'POST /api/v1/users should be called and return 200').toBe(200);
  expect(lessonBookedStatus, 'POST /api/v1/lessons should be called and return 200').toBe(200);
});
