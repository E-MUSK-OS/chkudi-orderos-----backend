export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle Zod validation errors cleanly
  if (err?.name === "ZodError" || err?.issues) {
    const issues = err.issues || [];
    const message = issues.map((i) => i.message).join(", ") || "Validation error occurred.";
    return res.status(400).json({
      success: false,
      message,
      errors: issues,
    });
  }

  // Handle Prisma transaction expired / timeout errors
  const rawMsg = String(err?.message || "");
  if (
    err?.code === "P2028" ||
    rawMsg.includes("Transaction already closed") ||
    rawMsg.includes("expired transaction") ||
    rawMsg.includes("Transaction API error")
  ) {
    return res.status(408).json({
      success: false,
      message: "Operation timed out while processing product variants. Please try again.",
    });
  }

  // Handle Prisma unique constraint violations (e.g. duplicate Master SKU or Variant SKU)
  if (err?.code === "P2002" || rawMsg.includes("Unique constraint failed")) {
    const target = Array.isArray(err?.meta?.target) ? err.meta.target.join(", ") : "SKU";
    return res.status(409).json({
      success: false,
      message: `A product with this ${target} already exists. Please use a unique value.`,
    });
  }

  // Clean up any other raw Prisma internal error invocations
  if (rawMsg.includes("Invalid `prisma.") || rawMsg.includes("PrismaClient")) {
    return res.status(500).json({
      success: false,
      message: "Database operation could not be completed. Please check your product attributes and try again.",
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
};
