import { Response, Locator } from '@playwright/test';
import { BasePage } from './basePage';

// Типи кроків квізу. Додавай нові варіанти по мірі того, як з'являються нові UI під АБ-тестами.
export enum StepType {
  SingleChoice = 'single-choice',
  MultipleChoice = 'multiple-choice',
  Info = 'info',
  TextInput = 'text-input',
  PhoneInput = 'phone-input',
  EmailInput = 'email-input',
  Booking = 'booking',
  PopUp = 'pop-up',
  Unknown = 'unknown',
}

export class QuizPage extends BasePage {
  private currentStepIndex = 0;

  // ---------- Локатори ----------

  get optionButtons() {
    return this.locator('button[data-mode]');
  }

  get nextButton() {
    return this.locator('button[class^=btn]');
  }

  get textInput() {
    return this.locator('input[type=text]');
  }

  get telInput() {
    return this.locator('input[type=tel]');
  }

  get emailInput() {
    return this.locator('input[type=email]');
  }

  get friendCodeButton() {
    return this.locator('role=button[name=\"Вказати код друга\"]'); // На майбутнє використання
  }

  get skipButton() {
    return this.locator('text=Пропустити');
  }

  get daySelector() {
    return this.locator('role=listitem');
  }

  get timeOfDaySelector() {
    return this.locator('p:has-text(\"Коли вам зручно відвідати урок?\") + div button');
  }

  get timeSlotSelector() {
    return this.locator('p:has-text(\"Оберіть час уроку\") + div button');
  }

  get bookButton() {
    return this.locator('role=button[name=\"Забронювати урок\"]');
  }

  get popupModal() {
    return this.locator('dialog[class*="ui-modal"]');
  }

  get popupClose() {
    return this.locator('button[aria-label="Close"]');
  }

  get popupBooking() {
    return this.locator('span[class^=btn]');
  }

  // ---------- Визначення типу поточного кроку ----------

  async isSingleChoiceStep(index: number = 0): Promise<boolean> {
    const hasOption = await this.optionButtons.nth(index).isVisible();
    const noNextButton = await this.nextButton.isHidden();
    console.log("Single Next " + await this.nextButton.count(), await this.optionButtons.count());
    return hasOption && noNextButton;
  }

  async isMultipleChoiceStep(index: number = 0): Promise<boolean> {
    const hasOption = await this.optionButtons.nth(index).isVisible();
    const hasNextButton = await this.nextButton.isVisible();
    console.log("Multi Next " + await this.nextButton.count(), await this.optionButtons.count());
    return hasOption && hasNextButton;
  }

  async isInfoStep(): Promise<boolean> {
    const hasOption = await this.optionButtons.nth(0).isHidden();
    const hasNextButton = await this.nextButton.isVisible();
    const noHasInput = await this.textInput.isHidden();
    console.log("Info Next " + await this.nextButton.count(), await this.optionButtons.count());
    return hasOption && hasNextButton && noHasInput;
  }

  async isTextInputStep(): Promise<boolean> {
    const hasInput = await this.textInput.isVisible();
    const hasNextButton = await this.nextButton.isVisible();
    console.log("Input = " + await this.nextButton.count(), await this.textInput.count());
    return hasInput && hasNextButton;
  }

  async isPhoneInputStep(): Promise<boolean> {
    const hasInput = await this.telInput.isVisible();
    const hasNextButton = await this.nextButton.isVisible();
    console.log("Phone = " + await this.nextButton.count(), await this.telInput.count());
    return hasInput && hasNextButton;
  }

  async isEmailInputStep(): Promise<boolean> {
    const hasInput = await this.emailInput.isVisible();
    const hasNextButton = await this.nextButton.isVisible();
    const hasSkipButton = await this.skipButton.isVisible();
    console.log("Email (next, input, skip) = " + await this.nextButton.count(), await this.emailInput.count(), await this.skipButton.count());
    return hasInput && hasNextButton && hasSkipButton;
  }

  async isBookingStep(): Promise<boolean> {
    const hasDay = await this.daySelector.nth(0).isVisible();
    const hasTime = await this.timeSlotSelector.nth(0).isVisible();
    const hasBookButton = await this.bookButton.isVisible();
    console.log("Booking (day, time, booking) = " + await this.daySelector.count(), await this.timeSlotSelector.count(), await this.bookButton.count());
    return hasDay && hasTime && hasBookButton;
  }

  async isPopup(index:number = 0): Promise<boolean> {
    return await this.popupModal.nth(index).isVisible();
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

  // ---------- Очікування без фіксованих таймаутів ----------
  // Синхронізуюсь по мережевих запитах intercom: ping — на первинному завантаженні
  // сторінки, page_view_events — при переході на кожен наступний крок.

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

  async open(path: string = '') {
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

  private async performTrackedAction(action: () => Promise<void>) {
    await Promise.all([
      this.waitForStepTracked(),
      action(),
    ]);
    this.currentStepIndex++;
  }

  // ---------- Визначення поточного кроку / завершення квізу ----------

  async getCurrentStepIndex(): Promise<number> {
    return this.currentStepIndex;
  }

  async isQuizFinished(): Promise<boolean> {
    return this.hasUrl('/request-gotten');
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
    await this.telInput.fill(phoneValue);
    await this.safeClick(this.nextButton);
  }

  async completeEmailStep(mailValue: string = "test@mail.com") {
    await this.emailInput.fill(mailValue);
    await this.safeClick(this.nextButton);
  }

  async completeBookingStep(index:number = 0, index2:number = 0) {
    await this.safeClick(this.daySelector.nth(index));
    await this.safeClick(this.timeOfDaySelector.nth(index2));
    await this.safeClick(this.bookButton);
  }

  async resolvePopup() {
    const popupOption = this.popupModal.locator(this.optionButtons).first();
    const popupNext = this.popupModal.locator(this.nextButton);
    const popupClose = this.popupModal.locator(this.popupClose);
    const popupBooking = this.popupModal.locator(this.popupBooking);

    if (await popupOption.isVisible()) {
      await popupOption.click();
    } else if (await popupNext.isVisible()) {
      await popupNext.click();
    } else if (await popupClose.isVisible()) {
      await popupClose.click();
    } else if (await popupBooking.isVisible()) {
      await popupBooking.click();
    } else {
      throw new Error('Popup з’явився, але невідомо як його закрити');
    }

    console.log("Pop up is resolved");
  }

  // перевіряти й закривати попап перед КОЖНОЮ спробою визначити крок
  async dismissPopupIfPresent() {
    while (await this.isPopup()) {
      await this.resolvePopup();
    }
  }

  // клік, що перевіряє й закриває попап і до, і одразу після дії — попап може
  // з'явитися як реакція саме на цей клік, а не тільки бути там заздалегідь
  private async safeClick(locator: Locator) {
    await this.dismissPopupIfPresent();
    await locator.click();
    await this.dismissPopupIfPresent();
  }

  // ---------- Диспетчер: пройти поточний крок незалежно від його типу ----------

  async completeCurrentStep() {
    await this.dismissPopupIfPresent();

    const type = await this.getCurrentStepType();

    switch (type) {
      case StepType.SingleChoice:
        return this.performTrackedAction(() => this.completeSingleChoiceStep());
      case StepType.MultipleChoice:
        return this.performTrackedAction(() => this.completeMultipleChoiceStep());
      case StepType.TextInput:
        return this.performTrackedAction(() => this.completeInputStep('PWtest'));
      case StepType.Info:
        return this.performTrackedAction(() => this.completeInfoStep());
      case StepType.PhoneInput:
        return this.performTrackedAction(() => this.completePhoneStep('111111111'));
      case StepType.EmailInput:
        return this.performTrackedAction(() => this.completeEmailStep('test123@mail.com'));
      case StepType.Booking:
        return this.performTrackedAction(() => this.completeBookingStep());
      default:
        throw new Error(`Unknown step type at step ${this.currentStepIndex}`);
    }
  }
}
