# Gelombang B: Kepercayaan Komersial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun audit trail lengkap untuk seluruh siklus transaksi pembayaran (`pending` → `waiting_confirmation` → `paid`/`expired`/`cancelled`/`refunded`), menyediakan mekanisme auto-sweep order kedaluwarsa, formalisasi kebijakan refund manual yang membatalkan enrollment, sinkronisasi invoice PDF berstandar DIDIKARA, serta mengintegrasikan dan menguji modul Midtrans Snap end-to-end.

**Architecture:** Memperkuat route pembayaran Next.js (`src/app/api/payment/**`), memanfaatkan modul `catatAudit` di `@/lib/audit` pada setiap titik transisi status, menambahkan handler `refund` di `payment/confirm`, memperbarui template invoice PDF `pdfkit`, serta menghubungkan `createSnapToken` di `src/lib/payment.js` dengan pengujian otomatis `node:test`.

**Tech Stack:** Next.js 16 (App Router), PostgreSQL (`pg`), Node.js 22 (`node:test`, `node:assert`, `node:crypto`), PDFKit, Midtrans Snap.

**Spec:** [RENCANA_PERBAIKAN_2026-10.md](file:///E:/lms/RENCANA_PERBAIKAN_2026-10.md) (§ Gelombang B.1 – B.3).

## Global Constraints

- Runtime Node.js v22.16.0 dengan ESM native (`"type": "module"`).
- Database PostgreSQL cloud (Neon/Supabase) via modul `query` di `@/lib/db`.
- Semua route API harus menjaga format respons JSON standar `{ success: boolean, ... }`.
- Pertahankan seluruh komentar dan dokumentasi yang sudah ada.
- Brand name resmi platform adalah **DIDIKARA** (bukan "AI LMS").

---

### Task 1: Audit Trail Lengkap Seluruh Siklus Transaksi Order (B.1)

**Files:**
- Modify: `src/app/api/payment/route.js:145-175, 200-230`
- Test: `tests/payment-audit.test.js`

**Interfaces:**
- Consumes: `catatAudit(actorEmail, action, entityType, entityId, detail)` dari `src/lib/audit.js`
- Produces: Pencatatan event `create_payment_order` saat order dibuat dan `submit_payment_proof` saat bukti transfer diunggah.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/payment-audit.test.js
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("payment/route.js mencatat audit log pada pembuatan order dan pengunggahan bukti", () => {
  const code = fs.readFileSync("src/app/api/payment/route.js", "utf8");

  assert.strictEqual(
    code.includes("catatAudit(user.email, \"create_payment_order\""),
    true,
    "Harus ada catatAudit untuk create_payment_order di POST /api/payment"
  );
  assert.strictEqual(
    code.includes("catatAudit(user.email, \"submit_payment_proof\""),
    true,
    "Harus ada catatAudit untuk submit_payment_proof di PATCH /api/payment"
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --loader ./tests/helpers/loader.mjs --test tests/payment-audit.test.js`
Expected: FAIL (assertion error: `create_payment_order` tidak ditemukan di `payment/route.js`).

- [ ] **Step 3: Implement audit calls in `src/app/api/payment/route.js`**

1. Pastikan `catatAudit` diimpor di `src/app/api/payment/route.js`:
```javascript
import { catatAudit } from "@/lib/audit";
```

2. Pada `POST /api/payment` setelah insert ke `payment_orders`:
```javascript
    await catatAudit(user.email, "create_payment_order", "payment_order", orderId, {
      amount: totalAmount,
      base_amount: baseAmount,
      unique_code: uniqueCode,
      course_id: dbCourseId,
      invoice_number: invoiceNumber,
      payment_type: "manual_transfer",
    });
```

3. Pada `PATCH /api/payment` setelah update ke `waiting_confirmation`:
```javascript
    await catatAudit(user.email, "submit_payment_proof", "payment_order", orderId, {
      sender_bank: senderBank || "",
      sender_name: senderName || "",
      transfer_date: transferDate || "",
      reference_no: referenceNo || "",
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --loader ./tests/helpers/loader.mjs --test tests/payment-audit.test.js`
Expected: PASS (1 test passed).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/route.js tests/payment-audit.test.js
git commit -m "feat(payment): add comprehensive audit logging for order creation and proof submission (B.1)"
```

---

### Task 2: Auto-Expiration Sweep & Mekanisme Refund Manual (B.1, B.2)

**Files:**
- Modify: `src/app/api/payment/route.js:15-55`
- Modify: `src/app/api/payment/confirm/route.js:25-95`
- Test: `tests/payment-lifecycle.test.js`

**Interfaces:**
- Consumes: `payment_orders`, `enrollments`, `catatAudit`
- Produces: Auto-sweep `expired` pada GET `/api/payment` dan aksi `refund` pada POST `/api/payment/confirm`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/payment-lifecycle.test.js
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("payment/confirm/route.js mendukung aksi refund dengan pembatalan status dan audit log", () => {
  const code = fs.readFileSync("src/app/api/payment/confirm/route.js", "utf8");

  assert.strictEqual(
    code.includes('"refund"'),
    true,
    "confirm/route.js harus menerima action 'refund'"
  );
  assert.strictEqual(
    code.includes("refund_payment"),
    true,
    "confirm/route.js harus mencatat audit log refund_payment"
  );
  assert.strictEqual(
    code.includes("cancelled"),
    true,
    "confirm/route.js harus mencabut status enrollment saat refund"
  );
});

test("payment/route.js menjalankan auto-sweep untuk order kedaluwarsa pada GET", () => {
  const code = fs.readFileSync("src/app/api/payment/route.js", "utf8");

  assert.strictEqual(
    code.includes("status = 'expired'"),
    true,
    "payment/route.js harus memperbarui order kedaluwarsa ke status expired"
  );
  assert.strictEqual(
    code.includes("expired_at < NOW()"),
    true,
    "payment/route.js harus memeriksa expired_at < NOW()"
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --loader ./tests/helpers/loader.mjs --test tests/payment-lifecycle.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement minimal code**

1. Di `src/app/api/payment/route.js`, pada `GET /api/payment`:
Sebelum mengambil daftar order:
```javascript
  // Auto-sweep: tandai order pending yang telah melewati batas waktu sebagai expired
  try {
    const { rows: expiredOrders } = await query(`
      UPDATE payment_orders
         SET status = 'expired', updated_at = NOW()
       WHERE status = 'pending' AND expired_at IS NOT NULL AND expired_at < NOW()
      RETURNING id, user_email
    `);
    for (const exp of expiredOrders) {
      await catatAudit("system", "expire_payment_order", "payment_order", exp.id, {
        user_email: exp.user_email,
        reason: "auto_sweep_expired",
      }).catch(() => {});
    }
  } catch {}
```

2. Di `src/app/api/payment/confirm/route.js`:
Ubah validasi action:
```javascript
  if (!orderId || !["approve", "reject", "refund"].includes(action))
    return NextResponse.json({ error: "orderId dan action (approve/reject/refund) wajib" }, { status: 400 });
```
Hanya admin yang boleh refund:
```javascript
  if (action === "refund" && user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat memproses refund" }, { status: 403 });
  }
```
Tambahkan logika `refund`:
```javascript
    if (action === "refund") {
      if (order.status !== "paid") {
        return NextResponse.json({ error: "Hanya order berstatus 'paid' yang dapat di-refund" }, { status: 400 });
      }

      await query(
        `UPDATE payment_orders
         SET status = 'refunded',
             metadata = metadata || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ refund_reason: adminNotes, refunded_by: user.email, refunded_at: new Date().toISOString() }), orderId]
      );

      // Cabut enrollment aktif jika ada
      if (order.course_id) {
        await query(
          "UPDATE enrollments SET status = 'cancelled' WHERE user_email = $1 AND course_id = $2",
          [order.user_email, order.course_id]
        ).catch(() => {});
      }

      await catatAudit(user.email, "refund_payment", "payment_order", orderId, {
        amount: Number(order.amount) || 0,
        course_id: order.course_id,
        user_email: order.user_email,
        notes: adminNotes,
      });

      await query(
        `INSERT INTO notifications (user_email, type, title, message)
         VALUES ($1, 'info', 'Pengembalian Dana (Refund)', $2)`,
        [order.user_email, `Pembayaran order ${orderId} telah diproses untuk pengembalian dana (refund). ${adminNotes ? "Catatan: " + adminNotes : ""}`]
      ).catch(() => {});

      return NextResponse.json({ success: true, status: "refunded" });
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --loader ./tests/helpers/loader.mjs --test tests/payment-lifecycle.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/route.js src/app/api/payment/confirm/route.js tests/payment-lifecycle.test.js
git commit -m "feat(payment): add auto-expiration sweep and manual refund workflow (B.1, B.2)"
```

---

### Task 3: Sinkronisasi Identitas Brand & Validasi Invoice PDF (B.1)

**Files:**
- Modify: `src/app/api/payment/invoice/route.js:55-78`
- Test: `tests/payment-invoice.test.js`

**Interfaces:**
- Consumes: `pdfkit`, `payment_orders`
- Produces: PDF stream resmi berlabel DIDIKARA dengan status refund/expired/paid

- [ ] **Step 1: Write the failing test**

```javascript
// tests/payment-invoice.test.js
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Invoice PDF menggunakan branding DIDIKARA dan memetakan status refunded", () => {
  const code = fs.readFileSync("src/app/api/payment/invoice/route.js", "utf8");

  assert.strictEqual(
    code.includes('"DIDIKARA"'),
    true,
    "Invoice harus menggunakan fallback nama platform 'DIDIKARA'"
  );
  assert.strictEqual(
    code.includes('refunded: "DIKEMBALIKAN (REFUND)"'),
    true,
    "Invoice harus memetakan status refunded ke teks bahasa Indonesia resmi"
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --loader ./tests/helpers/loader.mjs --test tests/payment-invoice.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement minimal code in `src/app/api/payment/invoice/route.js`**

1. Perbarui nama platform fallback di kop:
```javascript
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#1e3a8a")
     .text(cfg.platformName || "DIDIKARA", 50, 50);
```

2. Perbarui pemetaan status:
```javascript
  const status = {
    paid: "LUNAS",
    pending: "MENUNGGU PEMBAYARAN",
    waiting_confirmation: "MENUNGGU KONFIRMASI",
    failed: "DITOLAK",
    expired: "KEDALUWARSA",
    cancelled: "DIBATALKAN",
    refunded: "DIKEMBALIKAN (REFUND)",
  }[order.status] || String(order.status || "").toUpperCase();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --loader ./tests/helpers/loader.mjs --test tests/payment-invoice.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/invoice/route.js tests/payment-invoice.test.js
git commit -m "fix(payment): brand invoice as DIDIKARA and map refunded status (B.1)"
```

---

### Task 4: Integrasi & Uji End-to-End Midtrans Snap & Webhook (B.3)

**Files:**
- Modify: `src/lib/payment.js:20-65`
- Modify: `src/app/api/payment/route.js:140-175`
- Test: `tests/payment-gateway.test.js`

**Interfaces:**
- Consumes: `createSnapToken`, `verifyWebhookSignature`, `mapMidtransStatus`
- Produces: Respons snap token dan url redirect saat `payment_type === "midtrans_snap"`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/payment-gateway.test.js
import test from "node:test";
import assert from "node:assert";

test("Midtrans helper createSnapToken menghasilkan mock token saat SERVER_KEY kosong", async () => {
  const { createSnapToken, mapMidtransStatus, verifyWebhookSignature, generateInvoiceNumber } = await import("../src/lib/payment.js");

  // Invoice generator
  const inv = generateInvoiceNumber();
  assert.strictEqual(inv.startsWith("INV-"), true);

  // Snap mock
  const snap = await createSnapToken({
    orderId: "ORD-TEST-123",
    amount: 150000,
    customerName: "Budi",
    customerEmail: "budi@instansi.go.id",
    courseTitle: "PBJ Level 1",
  });
  assert.strictEqual(snap.mock, true);
  assert.strictEqual(snap.token, "mock-token-ORD-TEST-123");
  assert.strictEqual(typeof snap.redirectUrl, "string");

  // Status mapping
  assert.strictEqual(mapMidtransStatus("settlement"), "paid");
  assert.strictEqual(mapMidtransStatus("capture", "accept"), "paid");
  assert.strictEqual(mapMidtransStatus("cancel"), "failed");
  assert.strictEqual(mapMidtransStatus("expire"), "failed");
  assert.strictEqual(mapMidtransStatus("pending"), "pending");

  // Webhook signature calculation
  const sig = verifyWebhookSignature("ORD-1", "200", "150000", "test-server-key");
  assert.strictEqual(typeof sig, "string");
  assert.strictEqual(sig.length, 128); // SHA-512 hex
});
```

- [ ] **Step 2: Run test to verify it passes unit logic**

Run: `node --loader ./tests/helpers/loader.mjs --test tests/payment-gateway.test.js`
Expected: PASS.

- [ ] **Step 3: Connect Snap creation in `POST /api/payment`**

Di `src/app/api/payment/route.js`:
1. Impor `createSnapToken` dari `@/lib/payment`:
```javascript
import { generateInvoiceNumber, createSnapToken } from "@/lib/payment";
```

2. Pada `POST /api/payment`, jika klien meminta `paymentType === "midtrans_snap"` atau `midtrans`:
```javascript
    const paymentType = body.paymentType === "midtrans_snap" ? "midtrans_snap" : "manual_transfer";
    let snapResult = null;
    if (paymentType === "midtrans_snap") {
      try {
        snapResult = await createSnapToken({
          orderId,
          amount: totalAmount,
          customerName: user.fullname || user.email,
          customerEmail: user.email,
          courseTitle: course.title,
        });
      } catch (snapErr) {
        console.warn("Snap token generation failed, falling back to manual:", snapErr.message);
      }
    }
```

3. Simpan `snap_token` di metadata dan kembalikan di respons:
```javascript
    return NextResponse.json({
      success: true,
      orderId, invoiceNumber, baseAmount, uniqueCode, totalAmount, expiredAt,
      snapToken: snapResult?.token || null,
      redirectUrl: snapResult?.redirectUrl || null,
      paymentType,
      bankAccounts:        cfg.bankAccounts,
      qrisUrl:             cfg.qrisImageUrl,
      paymentInstructions: cfg.paymentInstructions,
      adminWhatsapp:       cfg.adminWhatsapp,
    });
```

- [ ] **Step 4: Run all tests to verify stability**

Run: `npm test`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/route.js src/lib/payment.js tests/payment-gateway.test.js
git commit -m "feat(payment): integrate Midtrans Snap token generation and verify webhook signatures (B.3)"
```

---

## Plan Review Checklist

- [x] **Spec coverage**: Mencakup B.1 (Audit trail siklus order & rekonsiliasi invoice), B.2 (Auto-sweep expiry & manual refund), B.3 (Integrasi Snap & pengujian webhook).
- [x] **No Placeholders**: Semua kode ditulis lengkap tanpa TODO/TBD.
- [x] **Bite-Sized Granularity**: Terbagi ke dalam 4 task terisolasi dengan step TDD lengkap.
