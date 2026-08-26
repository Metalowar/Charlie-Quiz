export type TestUser = {
  name: string;
  phone: string;
  email: string;
};

// Код мобільного оператора. Далі йдуть 7 цифр самого номера — разом 9 цифр,
// саме стільки очікує маска поля (+380 підставляється формою).
const OPERATOR_CODE = '93';

function randomDigits(length: number): string {
  let digits = '';
  for (let i = 0; i < length; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return digits;
}

function randomLetters(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let letters = '';
  for (let i = 0; i < length; i++) {
    letters += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return letters;
}

// Кожен прогін має реєструвати НОВОГО користувача:
export function createTestUser(): TestUser {
  const stamp = Date.now().toString(36);

  return {
    name: `Pwtest${randomLetters(5)}`,
    phone: `${OPERATOR_CODE}${randomDigits(7)}`,
    email: `pwtest.${stamp}.${randomDigits(4)}@mail.com`,
  };
}
