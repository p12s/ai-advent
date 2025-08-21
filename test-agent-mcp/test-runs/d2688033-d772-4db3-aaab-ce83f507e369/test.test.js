/**
 * Автоматически сгенерированные тесты
 * Язык: javascript
 * Фреймворк: jest
 * Функций: 2
 * Тестов: 2
 * Создано: 2025-08-21T11:32:21.006Z
 */

const { describe, test, expect } = require('@jest/globals');

import { isEven } from './module'; // assume your module is in a file named "module.js"

describe('isEven', () => {
  it('returns true for even numbers', () => {
    expect(isEven(4)).toBe(true);
    expect(isEven(10)).toBe(true);
  });

  it('returns false for odd numbers', () => {
    expect(isEven(3)).toBe(false);
    expect(isEven(7)).toBe(false);
  });

  it('handles zero correctly', () => {
    expect(isEven(0)).toBe(true);
  });

  it('returns false for negative even numbers', () => {
    expect(isEven(-4)).toBe(false); // zero is the only exception here
  });

  it('throws an error if num is not a number', () => {
    expect(() => isEven('hello')).toThrowError();
  });
});

import { capitalize } from './module'; // assuming the module is in a file named "module.js"

describe('capitalize', () => {
  it('should capitalize the first letter of a string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should leave the rest of the string unchanged', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });

  it('should work with strings that start with uppercase letters', () => {
    expect(capitalize('HELLO')).toBe('HELLO'); // nothing changes
  });

  it('should capitalize the first letter of an empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('should throw an error if the input is not a string', () => {
    expect(() => capitalize(123)).toThrowError(TypeError);
    expect(() => capitalize(null)).toThrowError(TypeError);
    expect(() => capitalize(undefined)).toThrowError(TypeError);
  });
});