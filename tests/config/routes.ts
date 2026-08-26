// Єдине місце, де живуть URL застосунку.
// baseURL у playwright.config.ts — це лише origin, усі шляхи нижче резолвляться від нього.
export const BASE_URL = process.env.BASE_URL ?? 'https://stage.allright.com';

export const ROUTES = {
  // Початок квізу реєстрації
  QUIZ_START: '/uk/app/sign-up/long/charlie/age-range',
  // Точка входу для бронювання, якщо воно не трапилось кроком квізу
  BOOKING: '/uk/app/dashboard',
  // Термінальна сторінка: означає, що квіз пройдено до кінця
  QUIZ_FINISHED: '/request-gotten',
} as const;

// Квіз має два різні фінали, залежно від того, чи трапилось бронювання його кроком:
//  - QUIZ_FINISHED — бронювання попереду, на дашборд треба заходити окремо;
//  - BOOKING (дашборд) — бронювання вже відбулось кроком квізу, і застосунок привів сюди.
// Обидва означають, що кроків більше не буде і цикл проходження треба зупиняти.
export const QUIZ_FINISH_ROUTES: string[] = [ROUTES.QUIZ_FINISHED, ROUTES.BOOKING];
