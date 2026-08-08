"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const auth_controller_1 = require("../controllers/auth.controller");
(0, node_test_1.default)('🛡️ Security and Authorization Test Suite', async (t) => {
    await t.test('1. Public Role Escalation Prevention', async () => {
        // Mock request trying to register as Super Admin
        const req = {
            body: {
                name: 'Attacker',
                email: 'attacker_role@evil.com',
                password: 'password123',
                role: 'Super Admin' // Should be ignored
            }
        };
        let jsonRes = null;
        let statusCode = 200;
        let cookies = {};
        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (data) => {
                jsonRes = data;
                return res;
            },
            cookie: (name, val, options) => {
                cookies[name] = val;
            }
        };
        const next = (err) => { throw err; };
        await auth_controller_1.AuthController.register(req, res, next);
        node_assert_1.default.strictEqual(statusCode, 201);
        node_assert_1.default.strictEqual(jsonRes.user.role, 'Student', 'Role should be forced to Student');
    });
    await t.test('2. Faculty & Student Authorization Guard', async () => {
        // We can test the requireRole middleware directly
        const { requireRole } = require('../middlewares/auth.middleware');
        // Create a mock requireRole('Faculty', 'Admin') middleware
        const middleware = requireRole(['Faculty', 'Admin']);
        // 1. Test Student trying to access Faculty route
        const reqStudent = { user: { role: 'Student' } };
        let jsonRes = null;
        let statusCode = 200;
        const resStudent = {
            status: (code) => {
                statusCode = code;
                return resStudent;
            },
            json: (data) => {
                jsonRes = data;
                return resStudent;
            }
        };
        let nextCalled = false;
        const nextStudent = () => { nextCalled = true; };
        middleware(reqStudent, resStudent, nextStudent);
        node_assert_1.default.strictEqual(statusCode, 403, 'Should reject Student from Faculty route');
        node_assert_1.default.strictEqual(jsonRes.error, 'Forbidden. Requires one of the following roles: Faculty, Admin', 'Should return proper error message');
        node_assert_1.default.strictEqual(nextCalled, false, 'Next should not be called');
        // 2. Test Faculty trying to access Faculty route
        const reqFaculty = { user: { role: 'Faculty' } };
        let nextCalledForFaculty = false;
        const nextFaculty = () => { nextCalledForFaculty = true; };
        middleware(reqFaculty, resStudent, nextFaculty);
        node_assert_1.default.strictEqual(nextCalledForFaculty, true, 'Next should be called for authorized role');
    });
});
