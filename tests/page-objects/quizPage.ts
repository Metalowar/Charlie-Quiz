import { Page, Response, Locator, ElementHandle } from '@playwright/test';
import { BasePage } from './basePage';
import { PopupHandler } from './components/popupHandler';
import { ROUTES, QUIZ_FINISH_ROUTES } from '../config/routes';
import { API } from '../network/endpoints';
import { TestUser } from '../utils/testUser';

// Типи кроків квізу. Додавай нові варіанти по мірі того, як з'являються нові UI під АБ-тестами.
export enum StepType {
  SingleChoice = 'single-choice',
  MultipleChoice = 'multiple-choice',
  Info = 'info',
  TextInput = 'text-input',
  PhoneInput = 'phone-input',
  EmailInput = 'email-input',
  Booking = 'booking',
  Unknown = 'unknown',
}

export class QuizPage extends BasePage {
  // Ці два селектори потрібні і кроку квізу, і попапу, тому винесені в константи.
  private static readonly OPTION_SELECTOR = 'button[data-mode]';
  private static readonly NEXT_SELECTOR = 'button[class^=btn]';

  // Скільки чекати, поки клікнутий елемент зникне з DOM
  private static readonly DETACH_TIMEOUT = 5_000;
  // Скільки чекати, поки з'явиться тип кроку Unknown.
  private static readonly STEP_DETECT_TIMEOUT = 10_000;
  private static readonly STEP_DETECT_INTERVAL = 250;
  // Як часто перевіряти попап, поки чекаємо на сигнал завершення кроку.
  private static readonly POPUP_WATCH_INTERVAL = 250;
  // Запобіжник від зависання, якщо якийсь крок не розпізнається / не веде далі
  private static readonly MAX_STEPS = 50;

  private readonly popups: PopupHandler;

  private currentStepIndex = 0;
  // Елемент, по якому клікнули останнім у межах поточного кроку для визначення, що його немає в DOM
  private lastClickedElement: ElementHandle<SVGElement | HTMLElement> | null = null;

  constructor(page: Page) {
    super(page);

    this.popups = new PopupHandler(page, {
      option: QuizPage.OPTION_SELECTOR,
      next: QuizPage.NEXT_SELECTOR,
    });
  }

  // ---------- Локатори ----------

  get optionButtons() {
    return this.locator(QuizPage.OPTION_SELECTOR);
  }

  get nextButton() {
    return this.locator(QuizPage.NEXT_SELECTOR);
  }

  get activeNextButton() {
    return this.locator(`${QuizPage.NEXT_SELECTOR}:not([disabled])`);
  }

  get textInput() {
    return this.locator('input[type=text]');
  }

  get telInput() {
    return this.locator('input[type=tel]');
  }

  get emailInput() {
    return this.locator('input[name="email"]');
  }

  get friendCodeButton() {
    return this.locator('role=button'); // На майбутнє використання
  }

  get skipButton() {
    return this.locator('div[class^="btn"]');
  }

  get daySelector() {
    return this.locator('ul > li');
  }

  get periodButton() {
    return this.locator('button[class*="text-subtitle"]');
  }

  get timeSelect() {
    return this.locator('div[class*="custom-select"]');
  }

  get langTypeButton() {
    return this.locator('div[class*="unsuccessful"] button');
  }

  get timeSlotSelector() {
    return this.locator('p:has-text(\"Оберіть час уроку\") + div button'); // Змінити на більш універсальний
  }

  // ---------- Визначення типу поточного кроку ----------

  async isSingleChoiceStep(index: number = 0): Promise<boolean> {
    const hasOption = await this.optionButtons.nth(index).isVisible();
    const noNextButton = await this.nextButton.first().isHidden();
    return hasOption && noNextButton;
  }

  async isMultipleChoiceStep(index: number = 0): Promise<boolean> {
    const hasOption = await this.optionButtons.nth(index).isVisible();
    const hasNextButton = await this.nextButton.first().isVisible();
    return hasOption && hasNextButton;
  }

  async isInfoStep(): Promise<boolean> {
    const noOption = await this.optionButtons.nth(0).isHidden();
    const hasNextButton = await this.nextButton.first().isVisible();
    const noHasInput = await this.textInput.isHidden();
    const noHasPhone = await this.telInput.isHidden();
    const noHasEmail = await this.emailInput.isHidden();
    const noHasDaySelector = await this.daySelector.first().isHidden();
    return noOption && hasNextButton && noHasInput && noHasPhone && noHasEmail && noHasDaySelector;
  }

  async isTextInputStep(): Promise<boolean> {
    const hasInput = await this.textInput.isVisible();
    const hasNextButton = await this.nextButton.first().isVisible();
    const noEmailInput = await this.emailInput.isHidden();
    return hasInput && hasNextButton && noEmailInput;
  }

  async isPhoneInputStep(): Promise<boolean> {
    const hasInput = await this.telInput.isVisible();
    const hasNextButton = await this.nextButton.first().isVisible();
    return hasInput && hasNextButton;
  }

  async isEmailInputStep(): Promise<boolean> {
    const hasInput = await this.emailInput.isVisible();
    const hasNextButton = await this.nextButton.nth(0).isVisible();
    const hasSkipButton = await this.skipButton.isVisible();
    return hasInput && hasNextButton && hasSkipButton;
  }

  async isBookingStep(): Promise<boolean> {
    const hasDay = await this.daySelector.nth(0).isVisible();
    const hasTime = await this.periodButton.nth(0).isVisible();
    const hasTimeSelect = await this.timeSelect.nth(0).isVisible();
    const hasTypeButton = await this.langTypeButton.nth(0).isVisible();
    const hasBookButton = await this.nextButton.nth(0).isVisible();
    return hasDay && hasBookButton && (hasTime || hasTimeSelect || hasTypeButton);
  }

  // Перевірка чи елемент, по якому щойно клікнули, точно зник з DOM
  private async waitForClickedElementDetached() {
    const handle = this.lastClickedElement;
    if (!handle) return;

    this.lastClickedElement = null;

    try {
      await this.page.waitForFunction((element) => !element.isConnected, handle, {
        timeout: QuizPage.DETACH_TIMEOUT,
      });
    } catch {
      // Є кроки, де клікнутий елемент лишається в DOM.
    } finally {
      await handle.dispose();
    }
  }

  async getCurrentStepType(): Promise<StepType> {
    if (await this.isSingleChoiceStep()) return StepType.SingleChoice;
    if (await this.isMultipleChoiceStep()) return StepType.MultipleChoice;
    if (await this.isInfoStep()) return StepType.Info;
    if (await this.isTextInputStep()) return StepType.TextInput;
    if (await this.isPhoneInputStep()) return StepType.PhoneInput;
    if (await this.isEmailInputStep()) return StepType.EmailInput;
    if (await this.isBookingStep()) return StepType.Booking;
    return StepType.Unknown;
  }

  // ---------- Очікування ----------
  // page_view_events — при переході на кожен наступний крок.

  private isPingResponse(response: Response): boolean {
    return (
      response.url().includes('api-iam.intercom.io/messenger/web/ping') &&
      response.request().method() === 'POST' &&
      response.status() === 200
    );
  }

  private waitForPageLoaded() {
    return this.page.waitForResponse((response) => this.isPingResponse(response));
  }

  async open(path: string = ROUTES.QUIZ_START) {
    await Promise.all([
      this.waitForPageLoaded(),
      this.page.goto(path),
    ]);
  }

  private isTrackResponse(response: Response): boolean {
    return (
      response.url().includes('api-iam.intercom.io/messenger/web/page_view_events') &&
      response.request().method() === 'POST' &&
      response.status() === 204
    );
  }

  private waitForStepTracked() {
    return this.page.waitForResponse((response) => this.isTrackResponse(response));
  }

  // Крок вважається пройденим, якщо відбувся page_view_events;
  // або зміна pathname
  private waitForStepDone(pathBefore: string) {
    const tracked = this.waitForStepTracked();
    const navigated = this.page.waitForURL((url) => url.pathname !== pathBefore);

    tracked.catch(() => {});
    navigated.catch(() => {});

    return Promise.race([tracked, navigated]);
  }

  // Попап може з'явитись з затримкою, тому навішую очікування перевірки на будь-який момент.
  private async waitForStepDoneWatchingPopups(pathBefore: string) {
    let settled = false;

    const watched = this.waitForStepDone(pathBefore).finally(() => {
      settled = true;
    });

    // Треба зробити reject, щоб в паузі між перевірками попапу він рахується необробленим
    watched.catch(() => {});

    while (!settled) {
      await Promise.race([
        watched.catch(() => {}),
        this.page.waitForTimeout(QuizPage.POPUP_WATCH_INTERVAL),
      ]);

      if (settled) break;

      await this.popups.dismissIfPresent();
    }

    return watched;
  }

  private async performTrackedAction(action: () => Promise<void>) {
    const pathBefore = new URL(this.page.url()).pathname;

    await Promise.all([
      this.waitForStepDoneWatchingPopups(pathBefore),
      action(),
    ]);

    // Страховка від редіректів.
    await this.page.waitForLoadState('load').catch(() => {});
    await this.waitForClickedElementDetached();

    this.currentStepIndex++;
  }

  // ---------- Визначення поточного кроку / завершення квізу ----------

  async getCurrentStepIndex(): Promise<number> {
    return this.currentStepIndex;
  }

  async isQuizFinished(): Promise<boolean> {
    return QUIZ_FINISH_ROUTES.some((route) => this.hasUrl(route));
  }

  // Проходить кроки один за одним, поки не дійде до термінальної сторінки.
  // Порядок і типи кроків заздалегідь невідомі — їх визначає А/Б-тест.
  async completeQuiz(user: TestUser) {
    let steps = 0;

    while (!(await this.isQuizFinished())) {
      if (steps >= QuizPage.MAX_STEPS) {
        throw new Error(
          `Квіз не завершився за ${QuizPage.MAX_STEPS} кроків. Поточний URL: ${this.page.url()}`
        );
      }

      await this.completeCurrentStep(user);
      steps++;
    }
  }

  // ---------- Бронювання пробного уроку (окремою сторінкою) ----------

  // Сесія вже в куках контексту, тому просто переходимо на дашборд 
  async openBooking() {
    await this.page.goto(ROUTES.BOOKING);
    await this.page.waitForLoadState('load').catch(() => {});
    await this.waitForBookingForm();
  }

  // Очікування форми бронювання і закриття поп-ап, якщо з'являться
  private async waitForBookingForm() {
    const deadline = Date.now() + QuizPage.STEP_DETECT_TIMEOUT;

    while (Date.now() < deadline) {
      await this.popups.dismissIfPresent();

      if (await this.isBookingStep()) return;

      await this.page.waitForTimeout(QuizPage.STEP_DETECT_INTERVAL);
    }

    throw new Error(
      `Форма бронювання не зʼявилась за ${QuizPage.STEP_DETECT_TIMEOUT}мс на ${this.page.url()}`
    );
  }

  private isLessonBookedResponse(response: Response): boolean {
    return (
      new URL(response.url()).pathname.endsWith(API.LESSONS) &&
      response.request().method() === 'POST'
    );
  }

  // Клікає «Забронювати урок» і повертає статус відповіді на POST /lessons.
  async bookLesson(): Promise<number> {
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => this.isLessonBookedResponse(r)),
      this.completeBookingStep(),
    ]);

    return response.status();
  }

  // ---------- Дії по типах кроку ----------

  async completeSingleChoiceStep(index: number = 0) {
    await this.safeClick(this.optionButtons.nth(index));
  }

  async completeMultipleChoiceStep() {
    await this.safeClick(this.optionButtons.nth(0));
    await this.safeClick(this.optionButtons.nth(1));
    await this.safeClick(this.nextButton);
  }

  async completeInfoStep() {
    await this.safeClick(this.nextButton);
  }

  async completeInputStep(inputValue: string = "Test") {
    await this.textInput.fill(inputValue);
    await this.safeClick(this.nextButton);
  }

  async completePhoneStep(phoneValue: string = "650001122") {
    await this.telInput.click();
    await this.telInput.pressSequentially(phoneValue);
    await this.page.waitForTimeout(500);
    await this.safeClick(this.activeNextButton);
  }

  async completeEmailStep(mailValue: string = "test@mail.com") {
    await this.emailInput.fill(mailValue);
    await this.safeClick(this.nextButton);
  }

  async completeBookingStep(index:number = 0, index2:number = 0) {
    // await this.safeClick(this.daySelector.nth(index)); // Розкоментувати, при перевірках деталі бронювання
    // await this.safeClick(this.periodButton.nth(index2));
    await this.page.waitForTimeout(500);
    await this.safeClick(this.nextButton.nth(index));
  }

  // Перевіряє й закриває попап.
  private async safeClick(locator: Locator) {
    await this.popups.dismissIfPresent();

    const handle = await locator.elementHandle();

    await locator.click();

    await this.lastClickedElement?.dispose();
    this.lastClickedElement = handle;

    await this.popups.dismissIfPresent();
  }

  // ---------- Пройти поточний крок незалежно від його типу ----------

  // Визначення кроку:
  // Якщо Unknown то це:
  // або занадто швидко пройшли перевірки і потрібно ще раз прогнати визначенн типу (протягом таймауту)
  // або з'явився інший тип кроку, який ще не оброблено.
  private async detectStepType(): Promise<StepType> {
    const deadline = Date.now() + QuizPage.STEP_DETECT_TIMEOUT;

    while (true) {
      await this.popups.dismissIfPresent();

      const type = await this.getCurrentStepType();
      if (type !== StepType.Unknown) return type;

      if (Date.now() >= deadline) return StepType.Unknown;

      await this.page.waitForTimeout(QuizPage.STEP_DETECT_INTERVAL);
    }
  }

  async completeCurrentStep(user: TestUser) {
    const type = await this.detectStepType();

    switch (type) {
      case StepType.SingleChoice:
        return this.performTrackedAction(() => this.completeSingleChoiceStep());
      case StepType.MultipleChoice:
        return this.performTrackedAction(() => this.completeMultipleChoiceStep());
      case StepType.TextInput:
        return this.performTrackedAction(() => this.completeInputStep(user.name));
      case StepType.Info:
        return this.performTrackedAction(() => this.completeInfoStep());
      case StepType.PhoneInput:
        return this.performTrackedAction(() => this.completePhoneStep(user.phone));
      case StepType.EmailInput:
        return this.performTrackedAction(() => this.completeEmailStep(user.email));
      case StepType.Booking:
        return this.performTrackedAction(() => this.completeBookingStep());
      default:
        throw new Error(
          `Unknown step type at step ${this.currentStepIndex} — тип не визначився за ` +
          `${QuizPage.STEP_DETECT_TIMEOUT}мс на ${this.page.url()}`
        );
    }
  }
}
