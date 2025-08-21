/**
 * Автоматически сгенерированные тесты
 * Язык: javascript
 * Фреймворк: jest
 * Функций: 2
 * Тестов: 2
 * Создано: 2025-08-21T11:26:59.764Z
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Глобальная настройка тестов
beforeEach(() => {
    // Инициализация перед каждым тестом
});

afterEach(() => {
    // Очистка после каждого теста
});

describe('add function', () => {
  it('should return the sum of two numbers', () => {
    expect(add(1, 2)).toBe(3);
    expect(add(-1, 2)).toBe(1);
    expect(add(0, 2)).toBe(2);
    expect(add(-1, -2)).toBe(-3);
    expect(add(1, -2)).toBe(-1);
  });

  it('should handle NaN result when one of the numbers is NaN', () => {
    expect(add(1, NaN)).toBe(NaN);
    expect(add(NaN, 2)).toBe(NaN);
  });

  it('should throw an error if non-numeric values are passed', () => {
    expect(() => add('a', 2)).toThrowError();
    expect(() => add(2, 'b')).toThrowError();
    expect(() => add('a', 'b')).toThrowError();
  });
});

describe('isEven', () => {
  it('should return true for even numbers', () => {
    expect(isEven(4)).toBe(true);
    expect(isEven(10)).toBe(true);
  });

  it('should return false for odd numbers', () => {
    expect(isEven(3)).toBe(false);
    expect(isEven(9)).toBe(false);
  });

  it('should return true for zero', () => {
    expect(isEven(0)).toBe(true);
  });

  it('should return false for negative even numbers', () => {
    expect(isEven(-4)).toBe(true);
    expect(isEven(-10)).toBe(true);
  });

  it('should return false for negative odd numbers', () => {
    expect(isEven(-3)).toBe(false);
    expect(isEven(-9)).toBe(false);
  });

  it('should throw an error for non-numeric input', () => {
    expect(() => isEven('hello')).toThrowError();
    expect(() => isEven(null)).toThrowError();
  });
});