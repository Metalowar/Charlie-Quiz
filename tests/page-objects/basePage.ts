import { Page, Locator } from '@playwright/test';

// В даній реалізації можна було обійтись і без цієї сторінки
// Залишив її для випадку, якщо даний квіз буде розширюватись або обросте додатковою логікою

export class BasePage {
  constructor(protected readonly page: Page) {}

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected hasUrl(fragment: string): boolean {
    return this.page.url().includes(fragment);
  }
}
