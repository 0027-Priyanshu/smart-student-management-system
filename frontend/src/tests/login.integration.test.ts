import test from 'node:test';
import assert from 'node:assert';

// 1. Mock global browser context variables synchronously first
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Define import.meta.env mock before importing other ES modules
(import.meta as any).env = {
  VITE_API_URL: 'http://localhost:5001/api',
  VITE_SOCKET_URL: 'http://localhost:5001'
};

Object.defineProperty(global, 'localStorage', { value: storageMock });
Object.defineProperty(global, 'window', { value: { location: { pathname: '', href: '' } } });

test('💻 Frontend Zustand Login Integration Test Suite', async (t) => {
  // Dynamically import axios API client and Zustand auth store to ensure env meta is loaded first
  const api = (await import('../utils/api')).default;
  const { useAuthStore } = await import('../stores/authStore');

  // Intercept axios POST login query with mock response
  api.post = async (url: string, data: any) => {
    if (url === '/auth/login') {
      if (data.email === 'student_login@edumanager.com' && data.password === 'StudentPass123') {
        return {
          data: {
            accessToken: 'test-jwt-access-token-999888',
            refreshToken: 'test-jwt-refresh-token-999888',
            user: { userId: 'user-stu-77', name: 'Zustand Integrator', email: data.email, role: 'Student' }
          }
        };
      } else {
        const err = new Error('Request failed with status code 401') as any;
        err.response = { data: { error: 'Invalid credentials' } };
        throw err;
      }
    }
    throw new Error(`Unhandled mock endpoint: ${url}`);
  };

  await t.test('1. Successful login updates store state & sets localStorage', async () => {
    // Assert initial state
    assert.strictEqual(useAuthStore.getState().isAuthenticated, false);
    assert.strictEqual(useAuthStore.getState().user, null);

    // Call store login action
    await useAuthStore.getState().login('student_login@edumanager.com', 'StudentPass123');

    // Assert state transitions
    assert.strictEqual(useAuthStore.getState().isAuthenticated, true);
    assert.ok(useAuthStore.getState().user);
    assert.strictEqual(useAuthStore.getState().user?.role, 'Student');
    
    // Assert localStorage syncing
    assert.strictEqual(localStorage.getItem('accessToken'), 'test-jwt-access-token-999888');
    assert.strictEqual(localStorage.getItem('refreshToken'), 'test-jwt-refresh-token-999888');
  });

  await t.test('2. Failed login keeps store unauthenticated & throws error', async () => {
    // Reset state via logout first
    await useAuthStore.getState().logout();
    assert.strictEqual(useAuthStore.getState().isAuthenticated, false);

    // Assert that incorrect password throws error
    await assert.rejects(
      async () => {
        await useAuthStore.getState().login('student_login@edumanager.com', 'WrongPass123');
      },
      /Invalid credentials/
    );

    // Assert auth store remains clean
    assert.strictEqual(useAuthStore.getState().isAuthenticated, false);
    assert.strictEqual(localStorage.getItem('accessToken'), null);
  });
});
