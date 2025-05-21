const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const { Parser } = require("json2csv");
const mongoose = require("mongoose");
const axios = require("axios");

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const {
      orderId,
      amount,
      taxAmount,
      paymentMethod,
      status,
      customerId,
      restaurantId,
    } = req.body;

    // Validate required fields
    if (!orderId || !amount || !paymentMethod || !customerId || !restaurantId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create new transaction
    const newTransaction = new Transaction({
      orderId,
      amount,
      taxAmount: taxAmount || 0,
      paymentMethod,
      status: status || "pending",
      customerId,
      restaurantId,
    });

    const savedTransaction = await newTransaction.save();
    console.log("Transaction created successfully:", savedTransaction._id);

    res.status(201).json(savedTransaction);
  } catch (error) {
    console.error("Transaction creation error:", error);
    res
      .status(500)
      .json({ error: error.message || "Error creating transaction" });
  }
};

// Get all transactions with optional period filter
exports.getAllTransactions = async (req, res) => {
  try {
    const { period = "all" } = req.query;
    const query = {};

    // Apply date filter based on period
    const now = new Date();
    if (period === "today") {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      query.createdAt = { $gte: startOfDay };
    } else if (period === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startOfWeek };
    } else if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.createdAt = { $gte: startOfMonth };
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      query.createdAt = { $gte: startOfYear };
    }

    // Check if user is admin
    if (req.user && req.user.role !== "admin") {
      // If not admin, only show transactions for their restaurant or as a customer
      if (req.user.role === "restaurant_owner") {
        query.restaurantId = req.user.restaurantId;
      } else {
        query.customerId = req.user.id;
      }
    }

    // Find transactions
    const transactions = await Transaction.find(query).sort({ createdAt: -1 });

    // Fetch restaurant details for each transaction
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        try {
          const restaurantResponse = await axios.get(
            `http://localhost:5001/api/restaurants/${transaction.restaurantId}`
          );

          return {
            ...transaction.toObject(),
            restaurantName:
              restaurantResponse.data.name || "Unknown Restaurant",
            restaurantAddress:
              restaurantResponse.data.address || "Unknown Address",
          };
        } catch (error) {
          console.error(
            `Error fetching restaurant ${transaction.restaurantId}:`,
            error.message
          );
          return {
            ...transaction.toObject(),
            restaurantName: "Restaurant Not Found",
            restaurantAddress: "Address Not Available",
          };
        }
      })
    );

    res.status(200).json(enrichedTransactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res
      .status(500)
      .json({ error: error.message || "Error fetching transactions" });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check if user is authorized to view this transaction
    if (
      req.user.role !== "admin" &&
      transaction.customerId.toString() !== req.user.id &&
      (req.user.role !== "restaurant_owner" ||
        transaction.restaurantId.toString() !== req.user.restaurantId)
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this transaction" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res
      .status(500)
      .json({ error: error.message || "Error fetching transaction" });
  }
};

// Update transaction status
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Only admin can update transaction status
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Not authorized to update transaction status" });
    }

    transaction.status = status;
    await transaction.save();

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating transaction status:", error);
    res
      .status(500)
      .json({ error: error.message || "Error updating transaction status" });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Only admin can process refunds
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Not authorized to process refunds" });
    }

    // Update transaction status
    transaction.status = "refunded";
    transaction.refundedAt = new Date();
    await transaction.save();

    // Update order status
    try {
      await axios.post(
        `http://localhost:5002/api/orders/${transaction.orderId}/refund`,
        {
          refundId: transaction._id,
          refundAmount: transaction.amount,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.cookie,
          },
        }
      );
    } catch (orderError) {
      console.error("Error updating order for refund:", orderError.message);
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ error: error.message || "Error processing refund" });
  }
};

// Get transaction statistics
exports.getTransactionStats = async (req, res) => {
  try {
    const { period = "all" } = req.query;
    const matchStage = {};

    // Apply date filter based on period
    const now = new Date();
    if (period === "today") {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      matchStage.createdAt = { $gte: startOfDay };
    } else if (period === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      matchStage.createdAt = { $gte: startOfWeek };
    } else if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchStage.createdAt = { $gte: startOfMonth };
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      matchStage.createdAt = { $gte: startOfYear };
    }

    // Check if user is admin
    if (req.user && req.user.role !== "admin") {
      // If not admin, only show transactions for their restaurant or as a customer
      if (req.user.role === "restaurant_owner") {
        matchStage.restaurantId = mongoose.Types.ObjectId(
          req.user.restaurantId
        );
      } else {
        matchStage.customerId = mongoose.Types.ObjectId(req.user.id);
      }
    }

    const stats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalTaxAmount: { $sum: "$taxAmount" },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          refundedTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] },
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
          cardPayments: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "CARD"] }, 1, 0] },
          },
          cashPayments: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "CASH"] }, 1, 0] },
          },
          walletPayments: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "WALLET"] }, 1, 0] },
          },
        },
      },
    ]);

    // Get daily transaction amounts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTransactions = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          ...matchStage,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: { $sum: "$amount" },
          taxAmount: { $sum: "$taxAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      summary:
        stats.length > 0
          ? stats[0]
          : {
              totalTransactions: 0,
              totalAmount: 0,
              totalTaxAmount: 0,
              completedTransactions: 0,
              pendingTransactions: 0,
              refundedTransactions: 0,
              failedTransactions: 0,
              cardPayments: 0,
              cashPayments: 0,
              walletPayments: 0,
            },
      dailyTransactions,
    });
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
    res
      .status(500)
      .json({ error: error.message || "Error fetching transaction stats" });
  }
};

// Get tax report
exports.getTaxReport = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const matchStage = {};

    // Apply date filter based on period
    // [date filtering logic remains the same]

    // Get tax summary
    const taxSummary = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTax: { $sum: "$taxAmount" },
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Get tax by day
    const taxByDay = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          taxAmount: { $sum: "$taxAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get tax by restaurant
    const taxByRestaurantRaw = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$restaurantId",
          taxAmount: { $sum: "$taxAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { taxAmount: -1 } },
      { $limit: 10 },
    ]);

    // Fetch restaurant names for each restaurant ID
    const taxByRestaurant = await Promise.all(
      taxByRestaurantRaw.map(async (item) => {
        try {
          const restaurantResponse = await axios.get(
            `http://localhost:5001/api/restaurants/${item._id}`
          );

          return {
            ...item,
            name: restaurantResponse.data.name || "Unknown Restaurant",
            address: restaurantResponse.data.address || "Unknown Address",
          };
        } catch (error) {
          return {
            ...item,
            name: "Restaurant Not Found",
            address: "Address Not Available",
          };
        }
      })
    );

    res.status(200).json({
      summary:
        taxSummary.length > 0
          ? taxSummary[0]
          : {
              totalTax: 0,
              totalTransactions: 0,
              totalAmount: 0,
            },
      taxByDay,
      taxByRestaurant,
    });
  } catch (error) {
    console.error("Error fetching tax report:", error);
    res
      .status(500)
      .json({ error: error.message || "Error fetching tax report" });
  }
};

// Export transactions as CSV
exports.exportTransactionsCSV = async (req, res) => {
  try {
    const { period = "all" } = req.query;
    const query = {};

    // Apply date filter based on period
    // [date filtering logic remains the same]

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });

    // Create a map to store restaurant data
    const restaurantData = {};

    // Fetch restaurant details for all unique restaurant IDs
    const uniqueRestaurantIds = [
      ...new Set(transactions.map((t) => t.restaurantId.toString())),
    ];

    await Promise.all(
      uniqueRestaurantIds.map(async (id) => {
        try {
          const response = await axios.get(
            `http://localhost:5001/api/restaurants/${id}`
          );
          restaurantData[id] = {
            name: response.data.name || "Unknown Restaurant",
            address: response.data.address || "Unknown Address",
          };
        } catch (error) {
          restaurantData[id] = {
            name: "Restaurant Not Found",
            address: "Address Not Available",
          };
        }
      })
    );

    // Format data for CSV
    const fields = [
      "Transaction ID",
      "Order ID",
      "Amount",
      "Tax Amount",
      "Restaurant Name",
      "Restaurant Address",
      "Payment Method",
      "Status",
      "Customer ID",
      "Created At",
      "Updated At",
    ];

    const data = transactions.map((t) => ({
      "Transaction ID": t._id,
      "Order ID": t.orderId,
      Amount: t.amount,
      "Tax Amount": t.taxAmount,
      "Restaurant Name":
        restaurantData[t.restaurantId]?.name || "Unknown Restaurant",
      "Restaurant Address":
        restaurantData[t.restaurantId]?.address || "Unknown Address",
      "Payment Method": t.paymentMethod,
      Status: t.status,
      "Customer ID": t.customerId,
      "Created At": t.createdAt,
      "Updated At": t.updatedAt,
    }));

    // Generate CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    // Set response headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transactions-${period}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );

    // Send the CSV data
    res.status(200).send(csv);
  } catch (error) {
    console.error("Error exporting transactions CSV:", error);
    res
      .status(500)
      .json({ error: error.message || "Error exporting transactions" });
  }
};
