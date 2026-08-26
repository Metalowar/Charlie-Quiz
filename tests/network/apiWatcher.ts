import { Page, Response } from '@playwright/test';

type ApiCall = {
  path: string;
  status: number;
};

// Слухає POST-відповіді і запам'ятовує статуси. Тест не знає, на якому саме кроці квізу
// відбудеться реєстрація чи бронювання (порядок кроків змінюється А/Б-тестами),
// тому статуси збираються фоном, а перевіряються в кінці.
export class ApiWatcher {
  // Зберігаю всі виклики, а не лише останній: якщо ендпоінт викликався двічі (ретрай),
  // у повідомленні про падіння видно всю історію, а не тільки фінальний код.
  private readonly calls: ApiCall[] = [];

  constructor(private readonly page: Page) {}

  start() {
    this.page.on('response', this.record);
  }

  stop() {
    this.page.off('response', this.record);
  }

  // Стрілка, а не метод: посилання має лишатись тим самим, щоб stop() зняв саме цей слухач.
  private readonly record = (response: Response) => {
    if (response.request().method() !== 'POST') return;

    this.calls.push({
      path: new URL(response.url()).pathname,
      status: response.status(),
    });
  };

  // endsWith, а не сувора рівність: шлях може мати префікс (локаль, версія API).
  statuses(path: string): number[] {
    return this.calls.filter((call) => call.path.endsWith(path)).map((call) => call.status);
  }

  lastStatus(path: string): number | null {
    return this.statuses(path).at(-1) ?? null;
  }

  wasCalled(path: string): boolean {
    return this.statuses(path).length > 0;
  }
}
