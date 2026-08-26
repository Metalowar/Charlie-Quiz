import { test, expect } from './fixtures/test';
import { API } from './network/endpoints';
import { QuizPage } from './page-objects/quizPage';

// Тест вважається пройденим, якщо отримую 200 по запитах на реєстрацію учасника
// І на запит бронювання пробного уроку. Статуси збирає фікстура api.
test('Quiz work. User created and lesson booking', async ({ page, testUser, api }) => {
  const quiz = new QuizPage(page);

  await test.step('User registration', async () => {
    await quiz.open();
    await quiz.completeQuiz(testUser);
  });

  // Якщо бронювання вже відбулось одним із кроків квізу — окрема сторінка не потрібна.
  if (!api.wasCalled(API.LESSONS)) {
    await test.step('Lesson booking (page)', async () => {
      await quiz.openBooking();
      await quiz.bookLesson();
    });
  }

  expect(
    api.lastStatus(API.USERS),
    `POST ${API.USERS} should be called and return 200, got: [${api.statuses(API.USERS)}]`
  ).toBe(200);

  expect(
    api.lastStatus(API.LESSONS),
    `POST ${API.LESSONS} should be called and return 200, got: [${api.statuses(API.LESSONS)}]`
  ).toBe(200);
});
