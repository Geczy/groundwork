import { describe, expect, it, vi } from 'vitest';
import { errorMessage, notifyError } from './notify';

describe('errorMessage', () => {
  it('uses the error message when there is one', () => {
    expect(errorMessage(new Error('Could not save.'))).toBe('Could not save.');
  });

  it('falls back when the message is blank', () => {
    expect(errorMessage(new Error('   '))).toBe('Something went wrong. Try again.');
  });
});

describe('notifyError', () => {
  it('raises a toast carrying the message', () => {
    const toastError = vi.fn<(message: string) => void>();
    notifyError(new Error('Could not save.'), toastError);
    expect(toastError).toHaveBeenCalledWith('Could not save.');
  });
});
