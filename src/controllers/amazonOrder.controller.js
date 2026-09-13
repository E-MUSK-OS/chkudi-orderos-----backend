import {
  savePrintedOrdersService,
  getAmazonOrdersService,
  updatePackingScanStatusService,
} from "../services/amazonOrder.service.js";

/**
 * Save printed Amazon orders
 * POST /api/v1/amazon-orders/save-printed
 */
export const savePrintedOrdersController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: "Orders array is required",
      });
    }

    const result = await savePrintedOrdersService(userId, orders);

    res.status(201).json({
      success: true,
      message: `Successfully saved ${result.count} printed Amazon order(s).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Amazon orders (with search, pagination, and packingScanStatus filter)
 * GET /api/v1/amazon-orders
 */
export const getAmazonOrdersController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search, packingScanStatus, date, page, limit } = req.query;

    const result = await getAmazonOrdersService({
      userId,
      search,
      packingScanStatus,
      date,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.orders,
      total: result.total,
      summary: result.summary,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update packing scan status by AWB / tracking number
 * PATCH /api/v1/amazon-orders/scan/:awb
 */
export const updatePackingScanStatusByAwbController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { awb } = req.params;
    const { status = "SCANNED" } = req.body;

    const updated = await updatePackingScanStatusService({
      userId,
      awb,
      status,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Amazon order with AWB / Order ID "${awb}" not found.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update packing scan status by record ID
 * PATCH /api/v1/amazon-orders/:id/status
 */
export const updatePackingScanStatusByIdController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status = "SCANNED" } = req.body;

    const updated = await updatePackingScanStatusService({
      userId,
      id,
      status,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Amazon order not found.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
