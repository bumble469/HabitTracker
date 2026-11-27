import { describe, expect, it } from 'vitest';
import { isValidSignupPassword, passwordRequirements } from './password';

describe('signup password requirements', () => {
  it.each(['Password1!', 'A long passphrase 7#', 'StrongPass1£', 'Password1🙂'])(
    'accepts a password meeting all requirements: %s', (password) => {
      expect(isValidSignupPassword(password)).toBe(true);
    }
  );

  it.each(['', 'Aa1!', 'password1!', 'Password!', 'Password1', 'Password1 ', 'Password1é'])(
    'rejects passwords missing a requirement: %s', (password) => {
      expect(isValidSignupPassword(password)).toBe(false);
    }
  );

  it('does not classify Unicode letters or whitespace as punctuation or symbols', () => {
    for (const ending of ['é', '文', ' ', '\t', '\n']) {
      expect(passwordRequirements(`Password1${ending}`).find(({ id }) => id === 'symbol').met).toBe(false);
    }
  });
});
