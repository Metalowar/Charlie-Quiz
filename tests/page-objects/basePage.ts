import { Page, Locator } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected hasUrl(fragment: string): boolean {
    return this.page.url().includes(fragment);
  }
}
