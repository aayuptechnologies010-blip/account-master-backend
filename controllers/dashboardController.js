const mongoose = require('mongoose');
const Client    = require('../models/Client');
const Item      = require('../models/Item');
const Salesman  = require('../models/Salesman');
const SaleBill  = require('../models/SaleBill');
const Invoice   = require('../models/Invoice');
const DebitNote = require('../models/DebitNote');
const Payment   = require('../models/Payment');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek  = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const LOW_STOCK_THRESHOLD = 10;

    const [
      totalClients,
      totalItems,
      lowStockCount,
      totalSalesmen,
      salesStats,
      invoiceStats,
      recentBills,
      topItems,
    ] = await Promise.all([

      // Total clients
      Client.countDocuments({ userId }),

      // Total items
      Item.countDocuments({ userId }),

      // Low stock items
      Item.countDocuments({ userId, stkBal: { $lt: LOW_STOCK_THRESHOLD } }),

      // Total salesmen
      Salesman.countDocuments({ userId }),

      // Sales aggregation — today / week / month / total
      SaleBill.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalCount:  { $sum: 1 },
            totalAmount: { $sum: '$amountR' },
            todayCount:  { $sum: { $cond: [{ $gte: ['$createdAt', startOfToday] }, 1, 0] } },
            todayAmount: { $sum: { $cond: [{ $gte: ['$createdAt', startOfToday] }, '$amountR', 0] } },
            weekCount:   { $sum: { $cond: [{ $gte: ['$createdAt', startOfWeek] }, 1, 0] } },
            weekAmount:  { $sum: { $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$amountR', 0] } },
            monthCount:  { $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, 1, 0] } },
            monthAmount: { $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$amountR', 0] } },
          },
        },
      ]),

      // Invoice stats by status
      Invoice.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id:    '$status',
            count:  { $sum: 1 },
            amount: { $sum: '$total' },
          },
        },
      ]),

      // Recent 5 sale bills
      SaleBill.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customerAc', 'partyName prtCd')
        .populate('salesmanId', 'name')
        .select('voucherNo amountR date customerAc salesmanId'),

      // Top 5 items by total qty sold
      SaleBill.aggregate([
        { $match: { userId: userObjectId } },
        { $unwind: '$items' },
        {
          $group: {
            _id:       '$items.itemId',
            totalQty:  { $sum: '$items.qty' },
            totalAmt:  { $sum: '$items.amount' },
          },
        },
        { $sort: { totalQty: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from:         'items',
            localField:   '_id',
            foreignField: '_id',
            as:           'item',
          },
        },
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id:      1,
            totalQty: 1,
            totalAmt: 1,
            name:     '$item.descript',
            code:     '$item.ipmrpCd',
            stkBal:   '$item.stkBal',
          },
        },
      ]),
    ]);

    // Format sales stats
    const s = salesStats[0] || {};
    const sales = {
      today: { count: s.todayCount || 0, amount: s.todayAmount || 0 },
      week:  { count: s.weekCount  || 0, amount: s.weekAmount  || 0 },
      month: { count: s.monthCount || 0, amount: s.monthAmount || 0 },
      total: { count: s.totalCount || 0, amount: s.totalAmount || 0 },
    };

    // Format invoice stats
    const invoices = { paid: { count: 0, amount: 0 }, pending: { count: 0, amount: 0 }, overdue: { count: 0, amount: 0 } };
    invoiceStats.forEach((i) => {
      if (invoices[i._id]) {
        invoices[i._id] = { count: i.count, amount: i.amount };
      }
    });

    res.json({
      success: true,
      dashboard: {
        summary: {
          totalClients,
          totalItems,
          totalSalesmen,
          lowStockItems: lowStockCount,
        },
        sales,
        invoices,
        recentBills,
        topItems,
      },
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /dashboard/activity — recent sales/credits/payments merged into one live feed
exports.getActivityFeed = async (req, res) => {
  try {
    const userId = req.user.id;

    const [bills, notes, payments] = await Promise.all([
      SaleBill.find({ userId }).sort({ createdAt: -1 }).limit(20)
        .populate('customerAc', 'partyName').select('voucherNo amountR salesmanName customerAc createdAt'),
      DebitNote.find({ userId }).sort({ createdAt: -1 }).limit(20)
        .populate('customerAc', 'partyName').select('voucherNo amountR salesmanName customerAc createdAt'),
      Payment.find({ userId }).sort({ createdAt: -1 }).limit(20)
        .populate('customerAc', 'partyName').select('voucherNo amount salesmanName customerAc createdAt'),
    ]);

    const activity = [
      ...bills.map((b) => ({
        type: 'sale',
        message: `${b.salesmanName || 'Someone'} created a ₹${b.amountR} invoice for ${b.customerAc?.partyName || 'a client'}`,
        timestamp: b.createdAt,
      })),
      ...notes.map((n) => ({
        type: 'debit_note',
        message: `${n.salesmanName || 'Someone'} issued a ₹${n.amountR} credit for ${n.customerAc?.partyName || 'a client'}`,
        timestamp: n.createdAt,
      })),
      ...payments.map((p) => ({
        type: 'payment',
        message: `${p.salesmanName || 'Someone'} collected a ₹${p.amount} payment from ${p.customerAc?.partyName || 'a client'}`,
        timestamp: p.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    res.json({ success: true, activity });
  } catch (err) {
    console.error('getActivityFeed error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
