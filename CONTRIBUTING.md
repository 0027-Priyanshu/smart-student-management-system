# Contributing to EduManager 🎓

Thank you for exploring and contributing to EduManager! Below are the guidelines for setting up your environment, running tests, and introducing features.

---

## 🛠️ Local Development Setup

### 1. Backend Settings
1. Navigate to `backend/` and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Copy the configuration template and populate your secrets:
   ```bash
   cp .env.example .env
   ```
3. Run the development server with hot-reloading:
   ```bash
   npm run dev
   ```
   *Note: If no `MONGO_URI` is specified in your `.env`, the database automatically falls back to an auto-seeded local JSON database file at `data/db.json`.*

### 2. Frontend Settings
1. Navigate to `frontend/` and install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
2. Copy the configuration template:
   ```bash
   cp .env.example .env.development
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🧪 Running the Test Suites

We enforce high test coverage across critical paths. We utilize Node's native lightweight test runner (zero external dependencies) and `tsx` execution wrapper.

### 1. Run Backend Unit Tests
Executes database CRUD, course allocations, and password hashing logic:
```bash
cd backend
npx ts-node src/tests/run-tests.ts
```

### 2. Run Frontend Integration Tests
Mocks browser `localStorage` and `axios` request adapters in Node to test Zustand state updates:
```bash
cd frontend
npx tsx src/tests/login.integration.test.ts
```

---

## 🛡️ Coding Guidelines & Principles

1. **Strict Type Safety**: Write strict TypeScript interfaces. Avoid `any` types where possible.
2. **Schema Interception**: Intercept and validate request bodies using Zod schemas inside `backend/src/schemas/` before routing calls to controller handlers.
3. **Data Resilience (Soft Deletes)**: Do not delete data directly. Instead, flag records as deactivated using `{ isDeleted: true }` so that cards are soft-deleted and easily recoverable.
4. **Real-time Live Synced Updates**: Integrate Socket.io calls (`emitLiveUpdate`) when making metrics-impacting updates (student signups, attendance changes, or new course logs) to refresh the administrative dashboard bells.
