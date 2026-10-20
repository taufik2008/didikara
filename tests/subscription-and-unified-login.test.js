import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hasActiveSubscription } from '../src/lib/courseAccess.js';

test('Unified Login: LoginPage hanya memiliki 1 form dan tidak memiliki role-selector/role-tab', () => {
  const loginSrc = fs.readFileSync(path.resolve('src/components/Login/LoginPage.js'), 'utf8');
  assert.equal(loginSrc.includes('role-selector'), false, 'role-selector harus dihapus dari LoginPage');
  assert.equal(loginSrc.includes('role-tab'), false, 'role-tab harus dihapus dari LoginPage');
  assert.ok(loginSrc.includes('handleCustomLoginSubmit'), 'Form login terpadu harus ada');
  assert.ok(loginSrc.includes('id="login-email"'), 'Input email login harus ada');
  assert.ok(loginSrc.includes('id="login-password"'), 'Input password login harus ada');
});

test('Subscription Database Schema: users memiliki subscription columns & tabel user_subscriptions tersedia', () => {
  const dbSrc = fs.readFileSync(path.resolve('src/lib/db.js'), 'utf8');
  assert.ok(dbSrc.includes('subscription_status VARCHAR(50)'), 'Kolom subscription_status harus ada di users');
  assert.ok(dbSrc.includes('subscription_plan VARCHAR(50)'), 'Kolom subscription_plan harus ada di users');
  assert.ok(dbSrc.includes('subscription_expires_at TIMESTAMPTZ'), 'Kolom subscription_expires_at harus ada di users');
  assert.ok(dbSrc.includes('CREATE TABLE IF NOT EXISTS user_subscriptions'), 'Tabel user_subscriptions harus ada');
});

test('Subscription Access Control: hasActiveSubscription helper memeriksa status langganan dan role bypass', async () => {
  // 1. Admin & instructor bypass
  assert.equal(await hasActiveSubscription({ role: 'admin' }), true, 'Admin harus bypass langganan');
  assert.equal(await hasActiveSubscription({ role: 'superadmin' }), true, 'Superadmin harus bypass langganan');
  assert.equal(await hasActiveSubscription({ role: 'instructor' }), true, 'Instructor harus bypass langganan');

  // 2. User biasa tanpa langganan
  assert.equal(await hasActiveSubscription({ role: 'student', subscription_status: 'none' }), false, 'Student tanpa langganan harus terkunci');
  assert.equal(await hasActiveSubscription({ role: 'student', subscription_status: 'expired' }), false, 'Student dengan langganan expired harus terkunci');

  // 3. User dengan status active tapi waktu expired sudah lewat
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  assert.equal(await hasActiveSubscription({ role: 'student', subscription_status: 'active', subscription_expires_at: pastDate }), false, 'Expired subscription harus false');

  // 4. User dengan status active dan masa berlaku valid
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  assert.equal(await hasActiveSubscription({ role: 'student', subscription_status: 'active', subscription_expires_at: futureDate }), true, 'Active subscription harus true');

  // 5. User dengan status active One-Time Charge (lifetime, subscription_expires_at = null)
  assert.equal(await hasActiveSubscription({ role: 'student', subscription_status: 'active', subscription_expires_at: null }), true, 'Lifetime one-time charge harus true');
});

test('Subscription Modal & Course Gate: Modal langganan One-Time Charge dan gating di LmsPage & CourseContext terpasang', () => {
  const modalSrc = fs.readFileSync(path.resolve('src/components/Modals/SubscriptionModal.js'), 'utf8');
  assert.ok(modalSrc.includes('ONE-TIME CHARGE'), 'Modal harus menampilkan badge ONE-TIME CHARGE');
  assert.ok(modalSrc.includes('Sekali Bayar'), 'Modal harus menjelaskan skema Sekali Bayar');
  assert.ok(modalSrc.includes('handleEnrollCourse'), 'Modal harus memicu pendaftaran/checkout membership');

  const lmsSrc = fs.readFileSync(path.resolve('src/components/Lms/LmsPage.js'), 'utf8');
  assert.ok(lmsSrc.includes('if (!isSubscribed)'), 'LmsPage harus memeriksa isSubscribed sebelum membuka modul');
  assert.ok(lmsSrc.includes('Akses Kursus Memerlukan Paket Langganan'), 'LmsPage harus menampilkan banner langganan jika belum subscribe');

  const courseCtxSrc = fs.readFileSync(path.resolve('src/context/CourseContext.js'), 'utf8');
  assert.ok(courseCtxSrc.includes('if (!isSubscribed)'), 'CourseContext harus memblokir akses kelas jika belum langganan');
  assert.ok(courseCtxSrc.includes('setShowSubscriptionModal(true)'), 'CourseContext harus membuka modal langganan');
});
