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

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
};