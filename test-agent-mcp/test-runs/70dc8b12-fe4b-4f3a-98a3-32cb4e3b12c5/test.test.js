/**
 * Автоматически сгенерированные тесты
 * Язык: javascript
 * Фреймворк: jest
 * Функций: 2
 * Тестов: 2
 * Создано: 2025-08-21T11:24:34.841Z
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Глобальная настройка тестов
beforeEach(() => {
    // Инициализация перед каждым тестом
});

afterEach(() => {
    // Очистка после каждого теста
});

import { add } from './module'; // assuming the module is in a file called 'module.js'

describe('add function', () => {
  it('should return the sum of two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should handle zero as one of the inputs', () => {
    expect(add(2, 0)).toBe(2);
  });

  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });

  it('should throw an error if not passed two arguments', () => {
    expect(() => add(2)).toThrowError();
  });

  it('should return the same result when inputs are reversed', () => {
    expect(add(3, 2)).toBe(5);
  });
});

describe('subtract function', () => {
  it('should subtract b from a correctly for positive numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });

  it('should subtract b from a correctly for negative numbers', () => {
    expect(subtract(-5, -3)).toBe(2);
  });

  it('should throw an error when a is not a number', () => {
    expect(() => subtract('a', 3)).toThrowError();
  });

  it('should throw an error when b is not a number', () => {
    expect(() => subtract(5, 'b')).toThrowError();
  });

  it('should handle edge case where a is 0', () => {
    expect(subtract(0, 2)).toBe(-2);
  });

  it('should handle edge case where b is 0', () => {
    expect(subtract(5, 0)).toBe(5);
  });
});