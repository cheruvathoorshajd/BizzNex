import { describe, it, expect } from 'vitest';
import { fmtMoney, sparkPoints, cx, calc, calcInput, fromDateInput, toDateInput, fmtShort, fmtDay, dotClass } from './utils';
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
    expect(() => calc('constructor')).toThrow();
    expect(() => calc('')).toThrow();
    expect(() => calc('5+')).toThrow();
    expect(() => calc('1.2.3')).toThrow();
  });

  it('respects precedence and reads ASCII operators too', () => {
    expect(calc('2+3×4')).toBe(14);
    expect(calc('10-4/2*3')).toBe(4);
  });

  it('reads decimals and leading zeros', () => {
    expect(calc('07+1')).toBe(8);
    expect(calc('007.5×2')).toBe(15);
    expect(calc('.5+.25')).toBe(0.75);
  });

  it('handles unary minus', () => {
    expect(calc('5−−3')).toBe(8);
    expect(calc('−4×−2')).toBe(8);
    expect(calc('2×−3')).toBe(-6);
  });

  it('uses phone-calculator percent semantics', () => {
    expect(calc('200+10%')).toBe(220);
    expect(calc('200−10%')).toBe(180);
    expect(calc('200×10%')).toBe(20);
    expect(calc('200÷50%')).toBe(400);
    expect(calc('100+50%×2')).toBe(101); // "50%×2" is a product (1), not a lone percent
  });

  it('errors on division by zero and non-finite results', () => {
    expect(() => calc('1÷0')).toThrow();
    expect(() => calc('0÷0')).toThrow();
    expect(() => calc('1e300×1e300')).toThrow();
  });

  it('keeps float noise out of results', () => {
    expect(calc('0.1+0.2')).toBe(0.3);
    expect(calc('1.1×3')).toBe(3.3);
  });

  it('reads back huge and tiny results so the next operation still works', () => {
    const big = String(calc('1000000000000×1000000000000')); // 1e+24
    expect(big).toBe('1e+24');
    expect(calc(big + '×2')).toBe(2e24);
    expect(calc(String(calc('1÷10000000')) + '+1')).toBe(1.0000001);
  });
});

describe('calcInput', () => {
  it('starts fresh after = when a digit is typed, and carries on with an operator', () => {
    expect(calcInput('42', '7', true)).toBe('7');
    expect(calcInput('42', '.', true)).toBe('0.');
    expect(calcInput('42', '+', true)).toBe('42+');
    expect(calcInput('42', '%', true)).toBe('42%');
    expect(calcInput('Error', '5')).toBe('5');
  });

  it('replaces a stacked operator but allows a unary minus', () => {
    expect(calcInput('5+', '×')).toBe('5×');
    expect(calcInput('5×', '−')).toBe('5×−');
    expect(calcInput('5−', '−')).toBe('5−−');
    expect(calcInput('5×−', '+')).toBe('5+');
    expect(calcInput('', '×')).toBe('');
    expect(calcInput('', '−')).toBe('−');
  });

  it('allows one decimal point per number and % only after a number', () => {
    expect(calcInput('1.5', '.')).toBe('1.5');
    expect(calcInput('1.5+', '.')).toBe('1.5+0.');
    expect(calcInput('5+', '%')).toBe('5+');
    expect(calcInput('10%', '5')).toBe('10%');
  });
});
