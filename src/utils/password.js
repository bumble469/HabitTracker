export function passwordRequirements(password) {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'capital', label: 'A capital letter (A–Z)', met: /[A-Z]/.test(password) },
    { id: 'number', label: 'A number (0–9)', met: /[0-9]/.test(password) },
    { id: 'symbol', label: 'A symbol, such as ! @ #', met: /[\p{P}\p{S}]/u.test(password) },
  ];
}

export function isValidSignupPassword(password) {
  return passwordRequirements(password).every(({ met }) => met);
}
