export const MAX_VAULT_CODE_LENGTH = 64;

export function insertVaultCode(current, inserted, selectionStart, selectionEnd, maxLength = MAX_VAULT_CODE_LENGTH) {
  const start = Math.max(0, Math.min(selectionStart ?? current.length, current.length));
  const end = Math.max(start, Math.min(selectionEnd ?? start, current.length));
  const value = `${current.slice(0, start)}${inserted}${current.slice(end)}`.slice(0, maxLength);

  return {
    value,
    caret: Math.min(start + inserted.length, value.length),
  };
}
