/**
 * Пример функции для тестирования
 */

function add(a, b) {
    return a + b;
}

function subtract(a, b) {
    return a - b;
}

function multiply(a, b) {
    return a * b;
}

function divide(a, b) {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}

function isEven(number) {
    return number % 2 === 0;
}

function isPrime(number) {
    if (number < 2) return false;
    if (number === 2) return true;
    if (number % 2 === 0) return false;
    
    for (let i = 3; i <= Math.sqrt(number); i += 2) {
        if (number % i === 0) return false;
    }
    return true;
}

function fibonacci(n) {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

function factorial(n) {
    if (n < 0) throw new Error('Factorial is not defined for negative numbers');
    if (n === 0 || n === 1) return 1;
    return n * factorial(n - 1);
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        add,
        subtract,
        multiply,
        divide,
        isEven,
        isPrime,
        fibonacci,
        factorial
    };
}
