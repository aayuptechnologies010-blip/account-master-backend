const Client = require('../models/Client');

const generatePartyCode = async () => {
  const count = await Client.countDocuments();
  return `RST${String(count + 1).padStart(3, '0')}`;
};

exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addClient = async (req, res) => {
  try {
    const count = await Client.countDocuments();
    const prtCd = await generatePartyCode();

    const client = new Client({
      ...req.body,
      sr: count + 1,
      prtCd,
    });

    await client.save();
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
