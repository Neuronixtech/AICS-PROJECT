const express = require('express');
const router = express.Router();
const {
  generateCertificate,
  getEligibleStudents,
  getIssuedCertificates
} = require('../controllers/certificateController');
const { protect, adminOnly } = require('../middleware/auth');

// All certificate routes require admin authentication
router.use(protect, adminOnly);

router.post('/generate/:studentId', generateCertificate);
router.get('/eligible', getEligibleStudents);
router.get('/issued', getIssuedCertificates);

module.exports = router;
