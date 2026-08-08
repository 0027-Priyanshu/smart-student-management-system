"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const readline_1 = __importDefault(require("readline"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-student-management';
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
const question = (query) => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};
async function bootstrapAdmin() {
    try {
        mongoose_1.default.set('strictQuery', true);
        await mongoose_1.default.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Connected to MongoDB');
        let email = process.env.ADMIN_EMAIL;
        let password = process.env.ADMIN_PASSWORD;
        if (!email) {
            email = await question('Enter Admin Email: ');
        }
        if (!password) {
            password = await question('Enter Admin Password: ');
        }
        if (!email || !password) {
            console.error('❌ Email and Password are required.');
            process.exit(1);
        }
        const cleanEmail = email.toLowerCase().trim();
        const existing = await User_1.default.findOne({ email: cleanEmail });
        if (existing) {
            console.error(`❌ User with email ${cleanEmail} already exists.`);
            process.exit(1);
        }
        const salt = bcryptjs_1.default.genSaltSync(10);
        const passwordHash = bcryptjs_1.default.hashSync(password, salt);
        await User_1.default.create({
            name: "System Admin",
            email: cleanEmail,
            password: passwordHash,
            role: "Admin",
            isVerified: true, // Admin is verified automatically
            verificationToken: null
        });
        console.log(`✅ Admin created successfully with email: ${cleanEmail}`);
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Failed to bootstrap admin:', error);
        process.exit(1);
    }
}
bootstrapAdmin();
