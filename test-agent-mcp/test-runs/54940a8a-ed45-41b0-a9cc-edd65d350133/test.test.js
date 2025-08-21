/**
 * Автоматически сгенерированные тесты
 * Язык: javascript
 * Фреймворк: jest
 * Функций: 3
 * Тестов: 3
 * Создано: 2025-08-21T11:46:43.928Z
 */

const { describe, test, expect } = require('@jest/globals');

import { add } from './module.js'; // assuming the module is in a file named "module.js"

describe('add function', () => {
  it('adds two numbers correctly', () => {
    expect(add(2, 3)).toBe(5); // positive test case
  });

  it('handles negative numbers correctly', () => {
    expect(add(-1, -2)).toBe(-3); // negative test case
  });

  it('returns correct result for zero', () => {
    expect(add(0, 0)).toBe(0); // edge case: adding zero to itself
  });

  it('throws an error if non-numeric input is provided', () => {
    expect(() => add('a', 3)).toThrowError(); // negative test case: non-numeric input
  });

  it('handles large numbers correctly', () => {
    expect(add(100, 200)).toBe(300); // edge case: adding large numbers
  });
});

import { multiply } from './module'; // Импортируем функцию из модуля

describe('multiply function', () => {
  it('should return the product of two numbers when both are positive integers', () => {
    expect(multiply(2, 3)).toBe(6);
  });

  it('should return the correct result for negative integers', () => {
    expect(multiply(-2, -3)).toBe(6);
  });

  it('should return the product of two numbers when one is positive and the other is zero', () => {
    expect(multiply(2, 0)).toBe(0);
  });

  it('should return the product of two numbers when one is positive and the other is a decimal number', () => {
    expect(multiply(2, 3.5)).toBe(7);
  });

  it('should return the correct result for negative decimal numbers', () => {
    expect(multiply(-2, -0.5)).toBe(1);
  });

  it('should throw an error when one or both inputs are not numbers', () => {
    expect(() => multiply('a', 3)).toThrowError();
    expect(() => multiply(2, 'b')).toThrowError();
    expect(() => multiply('a', 'b')).toThrowError();
  });
});

import { divide } from './module';

describe('divide', () => {
  it('should throw error when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrowError(new Error('Division by zero'));
  });

  it('should return correct result for positive numbers', () => {
    expect(divide(9, 3)).toBe(3);
  });

  it('should return correct result for negative numbers', () => {
    expect(divide(-9, 3)).toBe(-3);
  });

  it('should throw error when dividing by zero with strings', () => {
    expect(() => divide('9', '0')).toThrowError(new Error('Division by zero'));
  });

  it('should return correct result for decimal numbers', () => {
    expect(divide(10.5, 3)).toBeCloseTo(3.5);
  });

  it('should throw error when dividing by zero with complex numbers', () => {
    // 
    expect(() => divide({ real: 9, imag: 0 }, { real: 3, imag: 0 })).toThrowError(new Error('Division by zero'));
  });
});