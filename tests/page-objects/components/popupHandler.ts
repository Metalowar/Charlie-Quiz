import { Locator, Page } from '@playwright/test';

// Кнопки, які всередині попапу означають те саме, що й на кроці квізу.
// Приходять ззовні, щоб компонент не дублював знання про локатори квізу.
export type PopupActionSelectors = {
  option: string;
  next: string;
};

const MODAL = 'dialog[class*="ui-modal"]:visible';
const CLOSE_BUTTON = 'button[aria-label="Close"]';
const BOOKING_BUTTON = 'span[class^=btn]';

// Попап може з'явитись на будь-якому кроці квізу і на сторінці бронювання,
// тому це окремий компонент, а не частина конкретної сторінки.
export class PopupHandler {
  constructor(
    private readonly page: Page,
    private readonly actions: PopupActionSelectors
  ) {}

  private get modal(): Locator {
    return this.page.locator(MODAL);
  }

  async isPresent(): Promise<boolean> {
    return this.modal.first().isVisible();
  }

  // Перевіряти й закривати попап перед КОЖНОЮ спробою визначити крок
  async dismissIfPresent() {
    while (await this.isPresent()) {
      await this.resolve();
    }
  }

  private async resolve() {
    const popupOption = this.modal.locator(this.actions.option).first();
    const popupNext = this.modal.locator(this.actions.next);
    const popupClose = this.modal.locator(CLOSE_BUTTON);
    const popupBooking = this.modal.locator(BOOKING_BUTTON);

    if (await popupOption.isVisible()) {
      await this.page.waitForTimeout(500);
      await popupOption.click();
      await this.modal.waitFor({ state: 'hidden' });
    } else if (await popupNext.isVisible()) {
      await popupNext.click();
    } else if (await popupClose.isVisible()) {
      await popupClose.click();
      await this.modal.waitFor({ state: 'hidden' });
    } else if (await popupBooking.isVisible()) {
      await popupBooking.click();
      await this.modal.waitFor({ state: 'hidden' });
    } else {
      throw new Error('Popup з’явився, але невідомо як його закрити');
    }
  }
}
