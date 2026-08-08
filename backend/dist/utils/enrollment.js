"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEnrollmentNumber = generateEnrollmentNumber;
function generateEnrollmentNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `STU${year}${randomStr}`;
}
