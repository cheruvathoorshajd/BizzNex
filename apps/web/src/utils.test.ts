import { describe, it, expect } from 'vitest';
import { fmtMoney, sparkPoints, cx, calc, fromDateInput, toDateInput, fmtShort, fmtDay, dotClass } from './utils';
import { errorText } from './services/errors';

describe('utils', () => {
  it('formats money', () => {
    expect(fmtMoney(48290)).toBe('$48,290');
    expect(fmtMoney(0)).toBe('$0');
  });

  it('joins class names, dropping falsy', () => {
    expect(cx('a', false, 'b', undefined, null, 'c')).toBe('a b c');
  });

  it('builds a sparkline points string for a series', () => {
    const pts = sparkPoints([1, 2, 3], 84, 24);
    expect(pts.split(' ')).toHaveLength(3);
    expect(pts).toMatch(/^[\d., ]+$/);
  });
});

describe('calendar dates', () => {
  it('stores a date input as UTC midnight and reads the same day back', () => {
    expect(fromDateInput('2026-10-16')).toBe('2026-10-16T00:00:00.000Z');
    expect(fromDateInput('')).toBeNull();
    expect(toDateInput('2026-10-16T00:00:00.000Z')).toBe('2026-10-16');
  });

  it('shows the stored day in every time zone, not the day before', () => {
    // fmtShort/fmtDay format in UTC, so the result can't depend on where the test runs
    expect(fmtShort('2026-10-16T00:00:00.000Z')).toMatch(/16/);
    expect(fmtDay('2026-10-16T00:00:00.000Z')).toMatch(/16/);
  });

  it('maps task status to its dot', () => {
    expect(dotClass('Completed')).toBe('done');
    expect(dotClass('In Progress')).toBe('progress');
    expect(dotClass('Pending')).toBe('pending');
  });
});

describe('errorText', () => {
  it('prefers the first field error, then the server message', () => {
    expect(errorText({ status: 400, data: { errors: { fieldErrors: { title: ['Too long'] } } } })).toBe('Too long');
    expect(errorText({ status: 400, data: { message: 'Linked deal not found.' } })).toBe('Linked deal not found.');
  });

  it('explains network failures and rate limits', () => {
    expect(errorText({ status: 'FETCH_ERROR' })).toMatch(/can’t reach/);
    expect(errorText({ status: 429 })).toMatch(/Too many attempts/);
    expect(errorText(undefined, 'Fallback')).toBe('Fallback');
  });
});

describe('calc', () => {
  it('does arithmetic with the display operators', () => {
    expect(calc('12×3−4÷2')).toBe(34);
    expect(calc('0.1+0.2')).toBe(0.3);
  });

  it('treats % as percent, not modulo', () => {
    expect(calc('200×10%')).toBe(20);
    expect(calc('50%')).toBe(0.5);
  });

  it('rejects anything that is not arithmetic', () => {
    expect(() => calc('alert(1)')).toThrow();
    expect(() => calc('1÷0')).toThrow();
  });
});
