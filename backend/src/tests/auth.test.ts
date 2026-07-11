import test from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { RepoService } from '../services/repo.service';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/token';

test('🔒 Authentication Test Suite', async (t) => {
  
  await t.test('1. User creation and password verification', async () => {
    const email = 'test_auth@edumanager.com';
    const password = 'SecretPassword123';
    
    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    
    const user = await RepoService.createUser({
      name: 'Test Auth User',
      email,
      password: passwordHash,
      role: 'Admin',
      isVerified: true
    });
    
    assert.strictEqual(user.email, email);
    assert.ok(bcrypt.compareSync(password, user.password));
  });

  await t.test('2. Token generation and decoding verify', async () => {
    const payload = {
      userId: 'mock-user-id-55',
      email: 'token@test.com',
      role: 'Faculty',
      name: 'Token Trainer'
    };

    const accessToken = generateAccessToken(payload);
    const decoded = verifyAccessToken(accessToken);

    assert.ok(decoded);
    assert.strictEqual(decoded.userId, payload.userId);
    assert.strictEqual(decoded.role, payload.role);

    const refreshToken = generateRefreshToken({ userId: payload.userId });
    const decodedRefresh = verifyRefreshToken(refreshToken);

    assert.ok(decodedRefresh);
    assert.strictEqual(decodedRefresh.userId, payload.userId);
  });
});
