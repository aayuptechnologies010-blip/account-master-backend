const Client = require('../models/Client');
const Item = require('../models/Item');
const Salesman = require('../models/Salesman');

// Registry for the generic bulk-import engine. Add a new resource here
// (model + column aliases + validation rules) to support importing it —
// no changes needed anywhere else in the import pipeline.
const importSchemas = {
  clients: {
    model: Client,
    label: 'Clients',
    // prtCd is system-generated at insert time (RST001, RST002...) and
    // never appears in an uploaded file, so it can't be the dedupe key.
    // contactNo is the natural real-world identity for a customer row.
    uniqueKey: 'contactNo',
    requiredFields: ['partyName'],
    fieldTypes: {
      contactNo: 'phone',
      pinCode: 'string',
      partyGstinNo: 'string',
    },
    columnAliases: {
      name: 'partyName',
      'party name': 'partyName',
      partyname: 'partyName',
      'customer name': 'partyName',
      'store name': 'partyName',
      phone: 'contactNo',
      mobile: 'contactNo',
      contact: 'contactNo',
      'phone number': 'contactNo',
      'contact no': 'contactNo',
      'contact number': 'contactNo',
      city: 'areaName',
      area: 'areaName',
      'area name': 'areaName',
      'area code': 'areaCd',
      address: 'add1',
      'address 1': 'add1',
      address1: 'add1',
      'address line 1': 'add1',
      'address 2': 'add2',
      address2: 'add2',
      'address line 2': 'add2',
      'address 3': 'add3',
      address3: 'add3',
      pincode: 'pinCode',
      'pin code': 'pinCode',
      zip: 'pinCode',
      'zip code': 'pinCode',
      gstin: 'partyGstinNo',
      gst: 'partyGstinNo',
      'gst no': 'partyGstinNo',
      'gstin no': 'partyGstinNo',
    },
    // Client also has a system-assigned sr/prtCd (RST001, RST002...) that
    // never comes from the uploaded file but IS covered by a unique index
    // — every imported row needs one, or they'd all collide on the same
    // "missing" slot for this owner. Generates them once, sequentially,
    // before the batch insert (same numbering scheme as clientController.addClient,
    // which also always auto-assigns prtCd regardless of any user input).
    generateSystemFields: async (userId, mappedRows) => {
      const last = await Client.findOne({ userId }).sort({ sr: -1 }).select('sr');
      let nextSr = (last?.sr ?? 0) + 1;
      return mappedRows.map(() => {
        const fields = { sr: nextSr, prtCd: `RST${String(nextSr).padStart(3, '0')}` };
        nextSr += 1;
        return fields;
      });
    },
  },

  items: {
    model: Item,
    label: 'Items / Stock',
    // ipmrpCd is the system-generated item code (ITM001, ITM002...) —
    // descript (product name) is the natural real-world identity in a
    // catalog file.
    uniqueKey: 'descript',
    requiredFields: ['descript'],
    fieldTypes: {
      mrp: 'number',
      salnetRt: 'number',
      stkBal: 'number',
      gstPc: 'number',
    },
    columnAliases: {
      name: 'descript',
      'item name': 'descript',
      'product name': 'descript',
      description: 'descript',
      'item description': 'descript',
      'item code': 'ipmrpCd',
      code: 'ipmrpCd',
      sku: 'ipmrpCd',
      barcode: 'iBarcode',
      mrp: 'mrp',
      price: 'mrp',
      'sale rate': 'salnetRt',
      'net rate': 'salnetRt',
      'selling price': 'salnetRt',
      rate: 'salnetRt',
      stock: 'stkBal',
      'stock balance': 'stkBal',
      qty: 'stkBal',
      quantity: 'stkBal',
      gst: 'gstPc',
      'gst %': 'gstPc',
      'gst percent': 'gstPc',
      hsn: 'hsnCd',
      'hsn code': 'hsnCd',
      unit: 'unit',
      uom: 'unit',
    },
    // itemController.addItem lets a caller supply their own ipmrpCd and
    // only auto-generates when it's missing — mirrored here: rows that
    // already mapped an item code from the file keep it, the rest get
    // the next one in sequence.
    generateSystemFields: async (userId, mappedRows) => {
      const existingCount = await Item.countDocuments({ userId });
      let nextSeq = existingCount + 1;
      return mappedRows.map((mapped) => {
        if (mapped.ipmrpCd) return {};
        const code = `ITM${String(nextSeq).padStart(3, '0')}`;
        nextSeq += 1;
        return { ipmrpCd: code };
      });
    },
  },

  salesmen: {
    model: Salesman,
    label: 'Salesmen',
    // code is the system-generated salesman code (SM001, SM002...) —
    // phone is the natural real-world identity for a field agent row.
    uniqueKey: 'phone',
    requiredFields: ['name'],
    fieldTypes: {
      phone: 'phone',
      email: 'email',
    },
    columnAliases: {
      'salesman name': 'name',
      'agent name': 'name',
      'field agent': 'name',
      mobile: 'phone',
      contact: 'phone',
      'phone number': 'phone',
      'contact no': 'phone',
      'contact number': 'phone',
      region: 'area',
      territory: 'area',
      zone: 'area',
      'assigned area': 'area',
      'salesman code': 'code',
      'agent code': 'code',
    },
    // salesmanController.addSalesman also allows a caller-supplied code
    // and only auto-generates when missing — same rule here.
    generateSystemFields: async (userId, mappedRows) => {
      const existingCount = await Salesman.countDocuments({ userId });
      let nextSeq = existingCount + 1;
      return mappedRows.map((mapped) => {
        if (mapped.code) return {};
        const code = `SM${String(nextSeq).padStart(3, '0')}`;
        nextSeq += 1;
        return { code };
      });
    },
  },
};

module.exports = importSchemas;
