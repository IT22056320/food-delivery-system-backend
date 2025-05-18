const express = require("express");
const {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransactionStatus,
  processRefund,
  getTransactionStats,
  getTaxReport,
  exportTransactionsCSV,
} = require("../controllers/transactionController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Public routes
router.post("/", createTransaction);

// Protected routes
router.use(protect);
router.get("/", getAllTransactions);
router.get("/stats", getTransactionStats);
router.get("/tax-report", getTaxReport);
router.get("/export", exportTransactionsCSV);
router.get("/:id", getTransactionById);
router.put("/:id/status", updateTransactionStatus);
router.post("/:id/refund", processRefund);

module.exports = router;
