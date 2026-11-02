/**
 * Permission Middleware for checking Granular CRUD Rights (Create, Read, Update, Delete)
 */

const PERMISSION_ID_TO_PAGE_SLUG = {
  dashboard: "dashboard",
  vms: "vms",
  "vms/scans": "vms/scans",
  "vms/scans/trackingid-scan": "vms/scans/trackingid-scan",
  "vms/operator": "vms/operator",
  "vms/admin": "vms/admin",
  "vms/admin/users": "vms/admin/users",
  "vms/admin/account": "vms/admin/account",
  "products/inventory": "products/inventory",
  "settings/manage-product": "settings/manage-product",
  "order-process": "order-process",
  "order-process/myntra/manage-tag-loop": "order-process/myntra/manage-tag-loop",
  "order-process/myntra/myntra-order": "order-process/myntra/myntra-order",
  "order-process/myntra/myntra-picklist": "order-process/myntra/myntra-picklist",
  "order-process/myntra/stock-analysis": "order-process/myntra/stock-analysis",
  "order-process/myntra/invoice-formatter": "order-process/myntra/invoice-formatter",
  "order-process/amazon/order-process": "order-process/amazon/order-process",
  "order-process/amazon/awb-scan": "order-process/amazon/awb-scan",
  "products-analytics/amazon": "products-analytics/amazon",
  "transaction/sales/po-based": "transaction/sales/po-based",
  "offline-sales/sales-challan": "offline-sales/sales-challan",
  "offline-sales/sales-invoice": "offline-sales/sales-invoice",
  "purchase/finish-goods/challan": "purchase/finish-goods/challan",
  "purchase/finish-goods/invoice": "purchase/finish-goods/invoice",
  "settings/webstore": "settings/webstore",
  "settings/labels/label-config": "settings/labels/label-config",
  "settings/labels/label-print": "settings/labels/label-print",
  "settings/manage-users": "settings/manage-users",
  // Aliases
  vms_tracking: "vms/scans/trackingid-scan",
  products_profile: "settings/manage-product",
  order_process_amazon: "order-process/amazon/order-process",
  order_process_myntra: "order-process/myntra/myntra-picklist",
  warehouse_inventory: "products/inventory",
  sku_mapping: "settings/labels/label-print",
  barcode_labels: "settings/labels/label-config",
  settings_manage_users: "settings/manage-users",
  order_purchase_mat: "purchase/finish-goods/challan",
  challan_purchase_mat: "purchase/finish-goods/challan",
  invoice_purchase_mat: "purchase/finish-goods/invoice",
  debit_note_mat: "offline-sales/sales-invoice",
  order_desk_purchase_mat: "purchase/finish-goods/challan",
};

/**
 * Checks if a user has permission for a specific action on a resource.
 * @param {string} resourceId - The permission id or page slug (e.g. "settings/manage-product")
 * @param {"create" | "read" | "update" | "delete"} action - The CRUD action
 */
export const requirePermission = (resourceId, action) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // 1. Super Admin has full unrestricted access to everything
      if (user.role === "SUPERADMIN") {
        return next();
      }

      // 2. Check granular rights JSON FIRST if present
      if (user.rights) {
        try {
          const rightsList = typeof user.rights === "string" ? JSON.parse(user.rights) : user.rights;
          if (Array.isArray(rightsList) && rightsList.length > 0) {
            const cleanQuery = resourceId.replace(/^\/dashboard\/?/, "").replace(/\/+$/, "").toLowerCase();

            // Find matching permission entry (prefer exact, then prefix, then substring)
            let perm = rightsList.find((p) => {
              if (!p || !p.id) return false;
              const cleanId = p.id.replace(/^\/dashboard\/?/, "").replace(/\/+$/, "").toLowerCase();
              const cleanPath = (p.path || "").replace(/^\/dashboard\/?/, "").replace(/\/+$/, "").toLowerCase();
              return cleanId === cleanQuery || cleanPath === cleanQuery || (PERMISSION_ID_TO_PAGE_SLUG[p.id] || "").toLowerCase() === cleanQuery;
            });

            if (!perm) {
              perm = rightsList.find((p) => {
                if (!p || !p.id) return false;
                const cleanId = p.id.replace(/^\/dashboard\/?/, "").replace(/\/+$/, "").toLowerCase();
                const cleanPath = (p.path || "").replace(/^\/dashboard\/?/, "").replace(/\/+$/, "").toLowerCase();
                return cleanId.startsWith(cleanQuery) || cleanQuery.startsWith(cleanId) ||
                       cleanPath.startsWith(cleanQuery) || cleanQuery.startsWith(cleanPath);
              });
            }

            if (!perm) {
              perm = rightsList.find((p) => {
                if (!p || !p.id) return false;
                const cleanId = p.id.replace(/^\/dashboard\/?/, "").replace(/\/+$/, "").toLowerCase();
                return cleanId.includes(cleanQuery) || cleanQuery.includes(cleanId);
              });
            }

            if (perm) {
              const isAllowed = Boolean(perm[action]);
              if (isAllowed) {
                return next();
              }
              return res.status(403).json({
                success: false,
                message: `Access denied. You do not have '${action}' permission for this resource.`,
              });
            }
          }
        } catch (e) {
          console.error("Error parsing user rights in middleware:", e);
        }
      }

      const allowedPages = user.allowedPages || [];

      // 3. Fallback: "ALL" page access grants full permissions if no specific rights entry exists
      if (allowedPages.includes("ALL")) {
        return next();
      }

      // 3b. For ADMIN with unconfigured / empty allowedPages (legacy default), grant access
      if (user.role === "ADMIN" && allowedPages.length === 0 && (!user.rights || user.rights === "[]")) {
        return next();
      }

      // 4. Fallback for legacy users without specific `rights` JSON
      // If the resource page is in allowedPages, allow read, or check if allowedPages permits it
      const hasPageAccess = allowedPages.some(
        (page) => page === resourceId || resourceId.startsWith(page) || page.startsWith(resourceId)
      );

      if (hasPageAccess) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Access denied. You do not have permission to access ${resourceId}.`,
      });
    } catch (err) {
      console.error("Permission check error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authorization check",
      });
    }
  };
};

