// Функция для сложения двух чисел
function add(a, b) {
    return a + b;
}

// Функция для проверки, является ли число четным
function isEven(n) {
    return n % 2 === 0;
}

// Класс для работы с пользователем
class User {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
    
    greet() {
        return `Привет, меня зовут ${this.name} и мне ${this.age} лет.`;
    }
}

// Пример использования:
console.log(add(3, 5)); // 8
console.log(isEven(4)); // true

const user = new User('Алиса', 25);
console.log(user.greet()); // Привет, меня зовут Алиса и мне 25 лет.
