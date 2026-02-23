const Enquiry = require('../models/Enquiry');
const Student = require('../models/Student');

exports.addEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.create({ ...req.body, createdBy: req.user._id });
    const populated = await Enquiry.findById(enquiry._id).populate('interestedCourse', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllEnquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const enquiries = await Enquiry.find(filter).populate('interestedCourse', 'name').populate('createdBy', 'name').sort('-createdAt');
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('interestedCourse', 'name');
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });
    res.json(enquiry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });
    await enquiry.deleteOne();
    res.json({ message: 'Enquiry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
