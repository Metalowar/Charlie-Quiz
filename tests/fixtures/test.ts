import { test as base } from '@playwright/test';
import { ApiWatcher } from '../network/apiWatcher';
import { createTestUser, TestUser } from '../utils/testUser';

type QuizFixtures = {
  testUser: TestUser;
  api: ApiWatcher;
};

export const test = base.extend<QuizFixtures>({
  // Дані користувача — фікстура, а не поле сторінки: так їх видно у звіті
  // і так їх можна підмінити в конкретному тесті, не чіпаючи QuizPage.
  testUser: async ({}, use, testInfo) => {
    const user = createTestUser();

    testInfo.annotations.push({
      type: 'test user',
      description: `${user.name} / +380${user.phone} / ${user.email}`,
    });

    await use(user);
  },

  // Слухач вішається до тіла тесту, тому жодна відповідь не губиться.
  api: async ({ page }, use) => {
    const watcher = new ApiWatcher(page);
    watcher.start();

    await use(watcher);

    watcher.stop();
  },
});

export { expect } from '@playwright/test';
