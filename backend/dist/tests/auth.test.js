"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const repo_service_1 = require("../services/repo.service");
const token_1 = require("../utils/token");
(0, node_test_1.default)('🔒 Authentication Test Suite', async (t) => {
    await t.test('1. User creation and password verification', async () => {
        const email = 'test_auth@edumanager.com';
        const password = 'SecretPassword123';
        // Hash password
        const salt = bcryptjs_1.default.genSaltSync(10);
        const passwordHash = bcryptjs_1.default.hashSync(password, salt);
        const user = await repo_service_1.RepoService.createUser({
            name: 'Test Auth User',
            email,
            password: passwordHash,
            role: 'Admin',
            isVerified: true
        });
        node_assert_1.default.strictEqual(user.email, email);
        node_assert_1.default.ok(bcryptjs_1.default.compareSync(password, user.password));
    });
    await t.test('2. Token generation and decoding verify', async () => {
        const payload = {
            userId: 'mock-user-id-55',
            email: 'token@test.com',
            role: 'Faculty',
            name: 'Token Trainer'
        };
        const accessToken = (0, token_1.generateAccessToken)(payload);
        const decoded = (0, token_1.verifyAccessToken)(accessToken);
        node_assert_1.default.ok(decoded);
        node_assert_1.default.strictEqual(decoded.userId, payload.userId);
        node_assert_1.default.strictEqual(decoded.role, payload.role);
        const refreshToken = (0, token_1.generateRefreshToken)({ userId: payload.userId });
        const decodedRefresh = (0, token_1.verifyRefreshToken)(refreshToken);
        node_assert_1.default.ok(decodedRefresh);
        node_assert_1.default.strictEqual(decodedRefresh.userId, payload.userId);
    });
});
