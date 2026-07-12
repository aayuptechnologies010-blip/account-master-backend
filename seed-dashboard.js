const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is missing in .env');
  process.exit(1);
}

// Load models
const User = require('./models/User');
const Client = require('./models/Client');
const Item = require('./models/Item');
const Salesman = require('./models/Salesman');
const SaleBill = require('./models/SaleBill');
const DebitNote = require('./models/DebitNote');

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Fetch all users
    const users = await User.find({});
    if (users.length === 0) {
      console.log('No users found in database. Run create-admin.js first!');
      process.exit(0);
    }

    console.log(`Found ${users.length} user(s). Seeding dashboard data for each user...`);

    for (const user of users) {
      console.log(`\n--------------------------------------------`);
      console.log(`Seeding data for User: ${user.email} (${user._id})`);

      // Clean existing data for this user
      await Client.deleteMany({ userId: user._id });
      await Item.deleteMany({ userId: user._id });
      await Salesman.deleteMany({ userId: user._id });
      await SaleBill.deleteMany({ userId: user._id });
      await DebitNote.deleteMany({ userId: user._id });
      console.log('Existing clients, items, salesmen, sale bills, and debit notes cleaned.');

      // 1. Create Clients
      const clientData = [
        { prtCd: 'C001', partyName: 'Ramesh Provision Store', contactNo: '9876543211', areaName: 'Karol Bagh', add1: 'Shop 12, Main Market', pinCode: '110005', partyGstinNo: '07AAAAA1111A1Z1' },
        { prtCd: 'C002', partyName: 'Sharma Grocery Outlet', contactNo: '9876543212', areaName: 'Rajouri Garden', add1: 'A-22, Ring Road', pinCode: '110027', partyGstinNo: '07BBBBB2222B2Z2' },
        { prtCd: 'C003', partyName: 'Verma Sweets & Provision', contactNo: '9876543213', areaName: 'Connaught Place', add1: 'Block G, Outer Circle', pinCode: '110001', partyGstinNo: '07CCCCC3333C3Z3' },
        { prtCd: 'C004', partyName: 'Krishna Supermarket', contactNo: '9876543214', areaName: 'Rohini Sec 7', add1: 'Plot 4, Local Shopping Complex', pinCode: '110085', partyGstinNo: '' },
        { prtCd: 'C005', partyName: 'Metro Cash & Carry', contactNo: '9876543215', areaName: 'Karol Bagh', add1: 'Building 105, Ajmal Khan Road', pinCode: '110005', partyGstinNo: '07DDDDD4444D4Z4' }
      ];

      const clients = await Client.insertMany(
        clientData.map(c => ({ ...c, userId: user._id }))
      );
      console.log(`Created ${clients.length} clients.`);

      // 2. Create Items
      const itemData = [
        { ipmrpCd: 'I001', descript: 'Basmati Rice 5kg Premium', mrp: 450, salnetRt: 410, stkBal: 45, gstPc: 5, hsnCd: '1006', unit: 'bag' },
        { ipmrpCd: 'I002', descript: 'Fortune Mustard Oil 1L', mrp: 185, salnetRt: 165, stkBal: 8, gstPc: 12, hsnCd: '1507', unit: 'pcs' },
        { ipmrpCd: 'I003', descript: 'Tata Salt 1kg Refined', mrp: 28, salnetRt: 25, stkBal: 120, gstPc: 0, hsnCd: '2501', unit: 'pcs' },
        { ipmrpCd: 'I004', descript: 'Dettol Liquid Handwash 500ml', mrp: 120, salnetRt: 99, stkBal: 5, gstPc: 18, hsnCd: '3401', unit: 'pcs' },
        { ipmrpCd: 'I005', descript: 'Maggi Masala Noodles 12pk', mrp: 168, salnetRt: 150, stkBal: 60, gstPc: 18, hsnCd: '1902', unit: 'pcs' },
        { ipmrpCd: 'I006', descript: 'Aashirvaad Atta 10kg Shudh', mrp: 480, salnetRt: 440, stkBal: 3, gstPc: 5, hsnCd: '1101', unit: 'bag' }
      ];

      const items = await Item.insertMany(
        itemData.map(i => ({ ...i, userId: user._id }))
      );
      console.log(`Created ${items.length} items.`);

      // 3. Create Salesmen
      const salesmanData = [
        { code: 'S001', name: 'Amit Singh', phone: '9999111101', area: 'Karol Bagh' },
        { code: 'S002', name: 'Rajesh Kumar', phone: '9999111102', area: 'Rajouri Garden' },
        { code: 'S003', name: 'Sanjay Dutt', phone: '9999111103', area: 'Connaught Place' }
      ];

      const salesmen = await Salesman.insertMany(
        salesmanData.map(s => ({ ...s, userId: user._id }))
      );
      console.log(`Created ${salesmen.length} salesmen.`);

      // 4. Create Historical Sale Bills spanning the last 6 months (Feb 2026 to July 2026)
      const billsToCreate = [];

      // Helper to generate a date relative to now
      const getPastDate = (monthsAgo, day) => {
        const d = new Date();
        d.setMonth(d.getMonth() - monthsAgo);
        d.setDate(day);
        return d;
      };

      // Configuration for historical bills
      // Feb 2026 (5 months ago)
      billsToCreate.push({
        clientIndex: 0, salesmanIndex: 0, monthsAgo: 5, day: 10,
        lines: [
          { itemIndex: 0, qty: 10 },
          { itemIndex: 1, qty: 5 }
        ],
        balanceDivisor: 1
      });
      billsToCreate.push({
        clientIndex: 1, salesmanIndex: 1, monthsAgo: 5, day: 22,
        lines: [
          { itemIndex: 2, qty: 20 },
          { itemIndex: 3, qty: 10 }
        ],
        balanceDivisor: 2
      });

      // Mar 2026 (4 months ago)
      billsToCreate.push({
        clientIndex: 2, salesmanIndex: 2, monthsAgo: 4, day: 5,
        lines: [
          { itemIndex: 4, qty: 15 },
          { itemIndex: 5, qty: 8 }
        ],
        balanceDivisor: 1
      });
      billsToCreate.push({
        clientIndex: 3, salesmanIndex: 0, monthsAgo: 4, day: 18,
        lines: [
          { itemIndex: 0, qty: 5 },
          { itemIndex: 1, qty: 10 }
        ],
        balanceDivisor: 0
      });

      // Apr 2026 (3 months ago)
      billsToCreate.push({
        clientIndex: 4, salesmanIndex: 0, monthsAgo: 3, day: 12,
        lines: [
          { itemIndex: 2, qty: 40 },
          { itemIndex: 4, qty: 8 }
        ],
        balanceDivisor: 1
      });
      billsToCreate.push({
        clientIndex: 0, salesmanIndex: 0, monthsAgo: 3, day: 25,
        lines: [
          { itemIndex: 5, qty: 12 }
        ],
        balanceDivisor: 2
      });

      // May 2026 (2 months ago)
      billsToCreate.push({
        clientIndex: 1, salesmanIndex: 1, monthsAgo: 2, day: 8,
        lines: [
          { itemIndex: 0, qty: 12 },
          { itemIndex: 3, qty: 5 }
        ],
        balanceDivisor: 1
      });
      billsToCreate.push({
        clientIndex: 2, salesmanIndex: 2, monthsAgo: 2, day: 19,
        lines: [
          { itemIndex: 1, qty: 15 },
          { itemIndex: 4, qty: 25 }
        ],
        balanceDivisor: 0
      });

      // Jun 2026 (1 month ago)
      billsToCreate.push({
        clientIndex: 3, salesmanIndex: 0, monthsAgo: 1, day: 14,
        lines: [
          { itemIndex: 0, qty: 15 },
          { itemIndex: 2, qty: 50 },
          { itemIndex: 5, qty: 6 }
        ],
        balanceDivisor: 1
      });
      billsToCreate.push({
        clientIndex: 4, salesmanIndex: 0, monthsAgo: 1, day: 28,
        lines: [
          { itemIndex: 1, qty: 12 },
          { itemIndex: 3, qty: 15 }
        ],
        balanceDivisor: 2
      });

      // Jul 2026 (0 months ago - Current month)
      billsToCreate.push({
        clientIndex: 0, salesmanIndex: 0, monthsAgo: 0, day: 1,
        lines: [
          { itemIndex: 0, qty: 20 },
          { itemIndex: 1, qty: 15 },
          { itemIndex: 4, qty: 30 }
        ],
        balanceDivisor: 1
      });
      billsToCreate.push({
        clientIndex: 2, salesmanIndex: 2, monthsAgo: 0, day: 1,
        lines: [
          { itemIndex: 2, qty: 100 },
          { itemIndex: 3, qty: 25 },
          { itemIndex: 5, qty: 15 }
        ],
        balanceDivisor: 2
      });

      // Insert Sale Bills
      let billNumber = 1;
      for (const billDef of billsToCreate) {
        const client = clients[billDef.clientIndex];
        const salesman = salesmen[billDef.salesmanIndex];
        const billDate = getPastDate(billDef.monthsAgo, billDef.day);

        let totalQty = 0;
        let totalAmount = 0;
        const itemsList = billDef.lines.map(line => {
          const item = items[line.itemIndex];
          const amount = line.qty * item.salnetRt;
          totalQty += line.qty;
          totalAmount += amount;
          return {
            itemId: item._id,
            description: item.descript,
            qty: line.qty,
            price: item.salnetRt,
            amount: amount
          };
        });

        let balance = 0;
        if (billDef.balanceDivisor === 0) {
          balance = totalAmount;
        } else if (billDef.balanceDivisor === 2) {
          balance = Math.round(totalAmount / 2);
        }

        const newBill = new SaleBill({
          userId: user._id,
          voucherNo: `SB${String(billNumber).padStart(4, '0')}`,
          customerAc: client._id,
          salesmanId: salesman._id,
          salesmanName: salesman.name,
          osRefNo: `REF-${1000 + billNumber}`,
          date: billDate,
          area: client.areaName,
          gstin: client.partyGstinNo,
          creditAccounts: 'Sundry Debtors',
          items: itemsList,
          amountR: totalAmount,
          qty: totalQty,
          amountParty: totalAmount,
          balance: balance
        });

        await newBill.save();
        billNumber++;
      }

      console.log(`Created ${billNumber - 1} historical sale bills.`);
    }

    console.log('\n============================================');
    console.log('Database seeding finished successfully!');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
};

seedData();
