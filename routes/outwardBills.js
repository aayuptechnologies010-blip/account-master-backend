const router = require('express').Router();
const auth = require('../middleware/auth');
const saleBillCtrl = require('../controllers/outwardBillController');
const debitNoteCtrl = require('../controllers/debitNoteController');

// ── Menu ──────────────────────────────────────────────────────────────────────
router.get('/menu', auth, saleBillCtrl.getMenu);

// ── Form data (dropdowns: parties, items, salesmen, areas) ───────────────────
router.get('/form-data', auth, saleBillCtrl.getFormData);

// ── Party details + past bills + OS references ────────────────────────────────
router.get('/party/:partyId/details', auth, saleBillCtrl.getPartyDetails);

// ── Sale Bill ─────────────────────────────────────────────────────────────────
// Note: /voucher/:voucherNo must be before /:id to avoid route conflict
router.get('/sale-bill/voucher/:voucherNo', auth, saleBillCtrl.getSaleBillByVoucher);
router.get('/sale-bill',                    auth, saleBillCtrl.getSaleBills);
router.post('/sale-bill',                   auth, saleBillCtrl.addSaleBill);
router.put('/sale-bill/:id',                auth, saleBillCtrl.updateSaleBill);
router.delete('/sale-bill/:id',             auth, saleBillCtrl.deleteSaleBill);

// ── Debit Note (Amount & Item Wise) ───────────────────────────────────────────
// GET ?type=amount  → Debit Note (Amount - No Stock update)
// GET ?type=item    → Debit Note (Item Wise)
router.get('/debit-note/voucher/:voucherNo', auth, debitNoteCtrl.getDebitNoteByVoucher);
router.get('/debit-note',                    auth, debitNoteCtrl.getDebitNotes);
router.post('/debit-note',                   auth, debitNoteCtrl.addDebitNote);
router.put('/debit-note/:id',                auth, debitNoteCtrl.updateDebitNote);
router.delete('/debit-note/:id',             auth, debitNoteCtrl.deleteDebitNote);

module.exports = router;
