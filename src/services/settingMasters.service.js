import prisma from "../config/prisma.js";
import { getWorkspaceDropdownManagementMode } from "./clientConfiguration.service.js";
import {
  findClientConfigByWorkspaceId,
  upsertClientConfigByWorkspaceId,
} from "../repositories/clientConfiguration.repository.js";

export const EXCLUDED_FIELDS = new Set(["subcategory", "productsubcategory", "__field_initialized__"]);

const checkSettingMastersEditable = async (userId) => {
  // Setting Masters is accessible for configuration in both modes.
  // In "SETTING_MASTERS" mode, only Setting Masters can add/edit options (forms "+ Other" disabled).
  // In "FORM_OTHER" mode, both Setting Masters and forms can add/edit options and reflect instantly.
  return true;
};

// Normalize any field key to standard alphanumeric lowercase
export const normalizeFieldKey = (key) => {
  const clean = String(key || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean === "productcategory") return "category";
  if (clean === "productsubcategory") return "subcategory";
  if (clean === "colour" || clean === "colours") return "color";
  if (clean === "brandname") return "brand";
  if (clean === "companyname") return "company";
  if (clean === "userdepartment") return "department";
  if (clean === "sizes" || clean === "sizelist") return "size";
  if (clean === "gst") return "gstrate";
  return clean;
};

// Comprehensive mapping of known normalized field keys to clean human labels
export const KNOWN_FIELD_LABELS = {
  // Products & Materials Dropdowns (with "+ Other" support)
  color: "Color",
  category: "Product Category",
  materialcategory: "Material Category",
  materialsubcategory: "Material Sub-Category",
  manufacturinggroup: "Manufacturing Group",
  foruse: "For Use",
  costapplyingmode: "Cost Applying Mode",
  purchasetype: "Purchase Type",
  issuemode: "Issue Mode",
  consumptionmode: "Consumption Mode",
  brand: "Brand Name",
  unit: "Unit",
  size: "Size List",
  gender: "Gender",
  rackaddress: "Rack Address",
  availability: "Availability",
  gstrate: "GST Rate (%)",
  referenceparty: "Reference Party",
  marketplace: "Marketplace",

  // User Management & Company Dropdowns (with "+ Other" support)
  company: "Company Name",
  department: "Department",
  businesstype: "Business Type",
  tradecategory: "Trade Category",
  designation: "Designation",
  employeedesignation: "Employee Designation",
  salarytype: "Salary Type",
  workerprocess: "Worker Process",
  branch: "Branch",
  bloodgroup: "Blood Group",

  // Ledger Book & Accounting Dropdowns (with "+ Other" support)
  accounthead: "Account Head",
  ledgergroup: "Ledger Group",
  balancetype: "Balance Type",
  accounttype: "Account Type",
  considerinpnl: "Consider In P&L",

  // Sales & Purchase Challan Dropdowns (with "+ Other" support)
  challanfor: "Challan For",
  stockin: "Stock In",
  stockoutfrom: "Stock Out From",

  // Financial & General Accounting Masters (Setting Masters UI)
  advertisement: "Advertisement",
  agentbrokercontractor: "Agent/Broker/Contractor",
  bankac: "Bank A/C",
  basketgroups: "Basket Groups",
  baskets: "Baskets",
  buildings: "Buildings",
  capitalac: "Capital A/C",
  cashac: "Cash A/C",
  closingstock: "Closing Stock",
  dutiesandtaxes: "Duties And Taxes",
  employee: "Employee",
  expenseac: "Expense A/C",
  expenseacpnl: "Expense A/C (P & L)",
};

// Smart Humanizer that dynamically formats any camelCase, PascalCase, snake_case,
// or fused lowercase field key into a pristine human-readable title
export const humanizeFieldKey = (rawKey) => {
  if (!rawKey) return "";
  const norm = normalizeFieldKey(rawKey);
  if (KNOWN_FIELD_LABELS[norm]) return KNOWN_FIELD_LABELS[norm];

  // 1. Separate camelCase, PascalCase, snake_case, kebab-case
  let spaced = String(rawKey)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  // 2. If it's still a fused all-lowercase word, segment using common inventory/business vocabulary
  if (!spaced.includes(" ") && /^[a-z0-9]+$/i.test(spaced)) {
    const knownWords = [
      "subcategory", "manufacturing", "category", "group", "cost", "applying", "mode",
      "issue", "consumption", "purchase", "type", "for", "use", "reference", "party",
      "rack", "address", "gst", "rate", "brand", "unit", "size", "gender", "color",
      "business", "trade", "account", "head", "employee", "designation", "salary",
      "worker", "process", "branch", "blood", "company", "department", "role",
      "challan", "stock", "out", "from", "in", "balance", "consider", "pnl",
      "advertisement", "agent", "broker", "contractor", "bank", "basket", "baskets",
      "building", "buildings", "capital", "cash", "closing", "duties", "taxes", "tax",
      "expense", "partner", "courier", "warehouse", "zone", "status", "order",
      "package", "packages", "pack", "packing", "item", "vendor", "customer",
      "payment", "gateway", "shipping", "delivery", "carrier", "transport"
    ];
    knownWords.sort((a, b) => b.length - a.length);

    let remaining = spaced.toLowerCase();
    const segments = [];
    while (remaining.length > 0) {
      const match = knownWords.find((w) => remaining.startsWith(w));
      if (match) {
        segments.push(match);
        remaining = remaining.slice(match.length);
      } else {
        segments.push(remaining);
        break;
      }
    }
    if (segments.length > 1) {
      spaced = segments.join(" ");
    }
  }

  // 3. Title-case words while preserving standard business acronyms
  return spaced
    .split(/\s+/)
    .map((word) => {
      const wLower = word.toLowerCase();
      if (wLower === "gst") return "GST";
      if (wLower === "ac") return "A/C";
      if (wLower === "pnl") return "(P & L)";
      if (wLower === "dr") return "Dr";
      if (wLower === "cr") return "Cr";
      if (wLower === "id") return "ID";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
};

// Built-in registry of all form "+ Other" dropdowns across all pages with normalized lowercase keys
export const BUILTIN_OTHER_DROPDOWNS = {
  // --- 1. Products & Materials Dropdowns ---
  color: {
    label: "Color",
    defaults: [
      "White", "Black", "Green", "Red", "Sky-blue", "Cream", "Pink", "Maroon",
      "Blue", "Navy blue", "Gold", "Clear", "Silver", "Brown", "Teal",
      "Magenta", "Yellow", "Grey", "Charcoal", "Beige", "Olive", "Orange", "Purple"
    ],
  },
  category: {
    label: "Product Category",
    defaults: [
      "Clothing & Apparel", "Footwear & Shoes", "Electronics & Gadgets",
      "Bags, Wallets & Luggage", "Jewellery & Watches", "Beauty & Personal Care",
      "Home & Kitchen", "Sports & Fitness", "Baby & Kids Care", "Toys & Games",
      "Health & Wellness", "Books & Stationery", "Automotive", "Pet Supplies", "Office Products"
    ],
  },
  materialcategory: {
    label: "Material Category",
    defaults: [
      "Fabric", "Packaging", "Office Use", "DTF Logo", "Paper", "Bags", "Sample Fabric", "Trims", "Accessories"
    ],
  },
  materialsubcategory: {
    label: "Material Sub-Category",
    defaults: [
      "A4 Paper", "Amazon Bags", "Box", "Polybag", "Label", "Tag", "Thread", "Zipper", "Button"
    ],
  },
  manufacturinggroup: {
    label: "Manufacturing Group",
    defaults: [
      "Fabric", "Trim", "Packaging", "Accessory", "Stationery", "Service", "Consumables",
      "Raw Material", "Semi-Finished Goods", "Finished Goods", "Packing Material", "Trims & Accessories"
    ],
  },
  foruse: {
    label: "For Use",
    defaults: [
      "Amazon Packing Office",
      "Factory Production",
      "Sample Development",
      "Office Administration",
      "Retail Store",
      "Warehouse"
    ],
  },
  costapplyingmode: {
    label: "Cost Applying Mode",
    defaults: ["Weighted Average", "Average Cost", "FIFO", "LIFO", "Standard Cost", "Last Purchase Rate", "Last Purchase Price"],
  },
  purchasetype: {
    label: "Purchase Type",
    defaults: ["Regular Purchase", "Domestic", "Import", "Inter-State", "Local", "Job Work", "Sample", "Direct"],
  },
  issuemode: {
    label: "Issue Mode",
    defaults: ["FIFO", "LIFO", "Batch Wise", "Direct", "Manual", "Direct Consumption"],
  },
  consumptionmode: {
    label: "Consumption Mode",
    defaults: ["Direct", "Job Work", "BOM Based", "Manual", "Order Wise", "Batch Wise", "Periodic", "Standard BOM"],
  },
  brand: {
    label: "Brand Name",
    defaults: [],
  },
  unit: {
    label: "Unit",
    defaults: ["Pcs", "Set", "Box", "Dozen", "Meter", "Mtr", "Pair", "Kg", "Pics", "Gsm", "Yards", "Roll", "Packet"],
  },
  size: {
    label: "Size List",
    defaults: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "28", "30", "32", "34", "36", "38"],
  },
  gender: {
    label: "Gender",
    defaults: ["Men", "Women", "Kids", "Boys", "Girls", "Unisex"],
  },
  rackaddress: {
    label: "Rack Address",
    defaults: [],
  },
  availability: {
    label: "Availability",
    defaults: ["Public", "Private", "Wholesale"],
  },
  gstrate: {
    label: "GST Rate (%)",
    defaults: ["0%", "5%", "12%", "18%", "28%", "40%"],
  },
  referenceparty: {
    label: "Reference Party",
    defaults: [],
  },
  marketplace: {
    label: "Marketplace",
    defaults: ["All", "Myntra", "Amazon", "Flipkart"],
  },

  // --- 2. Organization, User & Company Dropdowns ---
  company: {
    label: "Company Name",
    defaults: [],
  },
  department: {
    label: "Department",
    defaults: [
      "Admin", "Cutting", "Stitching", "Finishing", "Store", "Inventory",
      "Accounts", "Marketing & Sales", "Maintenance", "HR", "Computer Operator",
      "Production [Overall]", "Production [Sub-Stitching]", "Sales & Dispatched"
    ],
  },
  businesstype: {
    label: "Business Type",
    defaults: ["Properiter", "Partnership", "Private Limited", "Public Limited", "LLP", "Individual"],
  },
  tradecategory: {
    label: "Trade Category",
    defaults: ["Manufacturing", "Wholesale", "Retail", "Service", "E-Commerce"],
  },
  designation: {
    label: "Designation",
    defaults: ["Admin", "Master", "Computer Operator", "Manager", "Supervisor", "Staff", "Helper"],
  },
  employeedesignation: {
    label: "Employee Designation",
    defaults: ["Admin", "Master", "Computer Operator", "Manager", "Supervisor", "Staff", "Helper"],
  },
  salarytype: {
    label: "Salary Type",
    defaults: ["Salaried", "Daily Wage", "Piece Rate", "Hourly"],
  },
  workerprocess: {
    label: "Worker Process",
    defaults: ["Cutting", "Embroidery", "Stitching", "Ironing", "Finishing", "Packing"],
  },
  branch: {
    label: "Branch",
    defaults: ["JAY BHAVANI FASHION - Sachin", "JAY BHAVANI FASHION - Head Office", "Main Branch"],
  },
  bloodgroup: {
    label: "Blood Group",
    defaults: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
  },

  // --- 3. Ledger Book, Accounts & Challan Dropdowns ---
  accounthead: {
    label: "Account Head",
    defaults: ["Sundry Debtors", "Sundry Creditors", "Employee", "Direct Expenses", "Indirect Expenses", "Sales Accounts"],
  },
  ledgergroup: {
    label: "Ledger Group",
    defaults: ["Sundry Debtors", "Sundry Creditors", "Direct Expenses", "Indirect Expenses", "Sales Accounts"],
  },
  balancetype: {
    label: "Balance Type",
    defaults: ["Dr", "Cr"],
  },
  accounttype: {
    label: "Account Type",
    defaults: ["Current", "Savings", "Cash Credit", "Overdraft"],
  },
  considerinpnl: {
    label: "Consider In P&L",
    defaults: ["Yes", "No"],
  },
  challanfor: {
    label: "Challan For",
    defaults: ["Purchase", "Borrow (Uchhina)", "Sales", "Return", "Sample", "Job Work"],
  },
  stockin: {
    label: "Stock In",
    defaults: ["General"],
  },
  stockoutfrom: {
    label: "Stock Out From",
    defaults: ["General"],
  },

  // --- 4. Financial & Setting Masters Reference Heads ---
  advertisement: {
    label: "Advertisement",
    defaults: ["Advertisement", "Marketing Ads", "Influencer Promos", "Print Media"],
  },
  agentbrokercontractor: {
    label: "Agent/Broker/Contractor",
    defaults: ["Direct Agent", "Broker Commission", "Third-Party Contractor"],
  },
  bankac: {
    label: "Bank A/C",
    defaults: ["HDFC Bank", "State Bank of India", "ICICI Bank", "Kotak Mahindra", "Axis Bank"],
  },
  basketgroups: {
    label: "Basket Groups",
    defaults: ["Standard Baskets", "Premium Assortments", "Promotional Packs"],
  },
  baskets: {
    label: "Baskets",
    defaults: ["Basket A", "Basket B", "Hamper 1", "Gift Set B"],
  },
  buildings: {
    label: "Buildings",
    defaults: ["Head Office", "Unit 1 - Sachin GIDC", "Surat Warehouse", "Factory Floor 2"],
  },
  capitalac: {
    label: "Capital A/C",
    defaults: ["Partner Capital", "Equity Capital", "Shareholder Equity"],
  },
  cashac: {
    label: "Cash A/C",
    defaults: ["Main Cash Drawer", "Petty Cash", "Floor Register"],
  },
  closingstock: {
    label: "Closing Stock",
    defaults: ["Raw Material Closing", "Finished Goods Closing", "WIP Stock"],
  },
  dutiesandtaxes: {
    label: "Duties And Taxes",
    defaults: ["GST Output (CGST/SGST/IGST)", "GST Input (ITC)", "TDS Payable", "TCS", "Customs Duty"],
  },
  employee: {
    label: "Employee",
    defaults: ["Salaried Employees", "Daily Wage Workers", "Contractors"],
  },
  expenseac: {
    label: "Expense A/C",
    defaults: ["Office Expense", "Freight & Cartage", "Utilities", "Rent", "Maintenance"],
  },
  expenseacpnl: {
    label: "Expense A/C (P & L)",
    defaults: ["Depreciation", "Bad Debts", "Legal & Professional Charges", "Audit Fees"],
  },
};

/**
 * Checks whether Setting Master defaults have been seeded for the workspace
 */
export const isWorkspaceDefaultsSeeded = async (userId) => {
  if (!userId) return false;
  try {
    const config = await findClientConfigByWorkspaceId(userId).catch(() => null);
    if (config?.configurationData && typeof config.configurationData === "object") {
      if (config.configurationData.settingMastersSeeded) {
        return true;
      }
    }
    const count = await prisma.dropdownOption.count({
      where: {
        userId,
        NOT: { field: { in: Array.from(EXCLUDED_FIELDS) } },
      },
    }).catch(() => 0);
    if (count > 50) {
      return true;
    }
  } catch (err) {
    console.warn("isWorkspaceDefaultsSeeded check error:", err.message);
  }
  return false;
};

/**
 * Seeds all 285 default values for all 50 groups into DropdownOption table.
 * Strictly avoids creating any __field_initialized__ dummy/marker rows,
 * and immediately purges any legacy __field_initialized__ rows from the database.
 */
export const seedAllSettingMasterDefaultsService = async (userId, { force = false } = {}) => {
  if (!userId) return { success: false, count: 0 };

  // 1. Permanently wipe out all __field_initialized__ marker rows
  await prisma.dropdownOption.deleteMany({
    where: { field: "__field_initialized__" },
  }).catch(() => {});

  const alreadySeeded = await isWorkspaceDefaultsSeeded(userId);
  if (alreadySeeded && !force) {
    return { success: true, count: 0, message: "Already seeded" };
  }

  let seededCount = 0;
  for (const [fieldKey, config] of Object.entries(BUILTIN_OTHER_DROPDOWNS)) {
    const normField = normalizeFieldKey(fieldKey);
    if (EXCLUDED_FIELDS.has(normField)) continue;
    const defaults = config.defaults || [];

    for (const defVal of defaults) {
      try {
        await prisma.dropdownOption.upsert({
          where: {
            userId_field_value: {
              userId,
              field: normField,
              value: defVal,
            },
          },
          update: {},
          create: {
            userId,
            field: normField,
            value: defVal,
            label: defVal,
            isActive: true,
          },
        });
        seededCount++;
      } catch (err) {
        // Skip duplicate or race condition
      }
    }
  }

  // 2. Record seeded state in ClientConfiguration
  try {
    const existing = await findClientConfigByWorkspaceId(userId).catch(() => null);
    const existingData = (existing?.configurationData && typeof existing.configurationData === "object")
      ? existing.configurationData
      : {};
    await upsertClientConfigByWorkspaceId(userId, {
      configurationData: {
        ...existingData,
        settingMastersSeeded: true,
        settingMastersSeededAt: new Date().toISOString(),
      },
    }, userId).catch(() => null);
  } catch (cfgErr) {
    console.warn("Could not record settingMastersSeeded in ClientConfiguration:", cfgErr.message);
  }

  return { success: true, count: seededCount };
};

/**
 * Dynamically fetches all Field Groups (Strictly deduplicated via normalized keys)
 */
export const getFieldGroupsService = async (userId) => {
  // 1. Always purge any legacy __field_initialized__ marker rows
  await prisma.dropdownOption.deleteMany({
    where: { field: "__field_initialized__" },
  }).catch(() => {});

  // 2. Ensure all setting master defaults are populated if not yet seeded
  const isSeeded = await isWorkspaceDefaultsSeeded(userId);
  if (!isSeeded) {
    await seedAllSettingMasterDefaultsService(userId).catch(() => {});
  }

  // 3. Query distinct fields from DropdownOption in DB
  let dbFields = [];
  try {
    const distinct = await prisma.dropdownOption.findMany({
      where: {
        userId,
        NOT: { field: { in: Array.from(EXCLUDED_FIELDS) } },
      },
      select: { field: true },
      distinct: ["field"],
    });
    dbFields = distinct.map((d) => d.field);
  } catch (err) {
    console.error("Error querying distinct fields from DB:", err);
  }

  // 4. Fetch all user options to count options per group
  let userOptions = [];
  try {
    userOptions = await prisma.dropdownOption.findMany({
      where: {
        userId,
        NOT: { field: { in: Array.from(EXCLUDED_FIELDS) } },
      },
      select: { id: true, field: true, value: true, label: true, isActive: true },
    });
  } catch (err) {
    console.error("Error fetching user options:", err);
  }

  // 5. Build map of user options by normalized field
  const userOptionsByField = new Map();
  userOptions.forEach((opt) => {
    const norm = normalizeFieldKey(opt.field);
    if (EXCLUDED_FIELDS.has(norm)) return;
    if (!userOptionsByField.has(norm)) userOptionsByField.set(norm, []);
    userOptionsByField.get(norm).push(opt);
  });

  // 6. Combine built-in dropdowns + all dynamic fields from DB using normalized key
  const fieldKeyMap = new Map();

  // Add all built-in definitions
  Object.keys(BUILTIN_OTHER_DROPDOWNS).forEach((key) => {
    const norm = normalizeFieldKey(key);
    if (EXCLUDED_FIELDS.has(norm)) return;
    fieldKeyMap.set(norm, {
      field: key,
      label: BUILTIN_OTHER_DROPDOWNS[key].label,
      defaults: BUILTIN_OTHER_DROPDOWNS[key].defaults,
    });
  });

  // Merge DB fields: if normalized key exists, reuse it; otherwise create dynamic entry
  dbFields.forEach((dbField) => {
    const norm = normalizeFieldKey(dbField);
    if (EXCLUDED_FIELDS.has(norm)) return;
    if (!fieldKeyMap.has(norm)) {
      fieldKeyMap.set(norm, {
        field: dbField,
        label: humanizeFieldKey(dbField),
        defaults: [],
      });
    }
  });

  const groups = Array.from(fieldKeyMap.entries())
    .filter(([normKey]) => !EXCLUDED_FIELDS.has(normKey))
    .map(([normKey, config]) => {
      const customForField = userOptionsByField.get(normKey) || [];
      const totalCount = customForField.length;
      const activeCount = customForField.filter((o) => o.isActive !== false).length;

      return {
        id: config.field,
        field: config.field,
        label: config.label,
        totalCount,
        activeCount,
      };
    });

  // Sort groups in A-Z order by label
  groups.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );

  // Assign sequential 1..N numbering in A-Z order
  groups.forEach((g, idx) => {
    g.no = idx + 1;
  });

  return groups;
};

/**
 * Ensures built-in default values for a field group are present in DB without any marker row.
 */
export const ensureFieldDefaultsInDb = async (userId, field) => {
  if (!userId || !field) return;
  const normField = normalizeFieldKey(field);
  if (EXCLUDED_FIELDS.has(normField)) return;

  const builtin = BUILTIN_OTHER_DROPDOWNS[normField];
  if (!builtin || !builtin.defaults || builtin.defaults.length === 0) return;

  try {
    const isSeeded = await isWorkspaceDefaultsSeeded(userId);
    if (isSeeded) {
      // Workspace is already seeded; honor deletions and customizations
      return;
    }

    for (const defVal of builtin.defaults) {
      await prisma.dropdownOption.upsert({
        where: {
          userId_field_value: {
            userId,
            field: normField,
            value: defVal,
          },
        },
        update: {},
        create: {
          userId,
          field: normField,
          value: defVal,
          label: defVal,
          isActive: true,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.error(`ensureFieldDefaultsInDb error for ${normField}:`, err.message);
  }
};

/**
 * Fetches all options for a specific field group
 */
export const getFieldOptionsService = async (userId, field) => {
  if (!field) throw new Error("Field parameter is required");
  const normField = normalizeFieldKey(field);
  if (EXCLUDED_FIELDS.has(normField)) {
    return [];
  }

  // Ensure defaults are present in DB if not yet seeded
  await ensureFieldDefaultsInDb(userId, normField);

  const builtin = BUILTIN_OTHER_DROPDOWNS[normField];
  const defaults = builtin ? builtin.defaults : [];

  let dbOptions = [];
  try {
    const fieldQueries = [
      { field: { equals: field, mode: "insensitive" } },
      { field: { equals: normField, mode: "insensitive" } },
    ];
    if (normField === "color") {
      fieldQueries.push({ field: { equals: "colour", mode: "insensitive" } });
      fieldQueries.push({ field: { equals: "colours", mode: "insensitive" } });
    }

    dbOptions = await prisma.dropdownOption.findMany({
      where: {
        userId,
        OR: fieldQueries,
        NOT: { field: { in: Array.from(EXCLUDED_FIELDS) } },
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.warn(`Initial query failed for field ${field}, retrying once:`, err.message);
    try {
      dbOptions = await prisma.dropdownOption.findMany({
        where: {
          userId,
          OR: [
            { field: { equals: field, mode: "insensitive" } },
            { field: { equals: normField, mode: "insensitive" } },
          ],
          NOT: { field: { in: Array.from(EXCLUDED_FIELDS) } },
        },
        orderBy: { createdAt: "asc" },
      });
    } catch (retryErr) {
      console.error(`Retry query also failed for field ${field}:`, retryErr.message);
    }
  }

  const validDbOptions = (dbOptions || []).filter(
    (o) => !EXCLUDED_FIELDS.has(normalizeFieldKey(o.field))
  );

  const isSeeded = await isWorkspaceDefaultsSeeded(userId);
  const merged = [];

  if (validDbOptions.length > 0) {
    validDbOptions.forEach((dbOpt) => {
      merged.push({
        id: dbOpt.id,
        field,
        value: dbOpt.value,
        label: dbOpt.label || dbOpt.value,
        isActive: dbOpt.isActive !== false,
        isDefault: defaults.some((d) => d.toLowerCase() === dbOpt.value.toLowerCase()),
        createdAt: dbOpt.createdAt,
      });
    });
  } else if (!isSeeded && defaults.length > 0) {
    // Only if workspace is completely unseeded, provide built-in defaults
    defaults.forEach((defVal) => {
      merged.push({
        id: `default_${normField}_${defVal}`,
        field,
        value: defVal,
        label: defVal,
        isActive: true,
        isDefault: true,
        createdAt: null,
      });
    });
  }

  // Group into default options and newly added (custom) options
  const defaultItems = merged.filter((item) => item.isDefault);
  const newlyAddedItems = merged.filter((item) => !item.isDefault);

  // Default values sorted A to Z
  defaultItems.sort((a, b) =>
    (a.label || a.value).localeCompare(b.label || b.value, undefined, {
      sensitivity: "base",
      numeric: true,
    })
  );

  // Newly added values placed at the LAST, ordered by creation time
  newlyAddedItems.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.label || a.value).localeCompare(b.label || b.value, undefined, {
      sensitivity: "base",
      numeric: true,
    });
  });

  const finalOrdered = [...defaultItems, ...newlyAddedItems];
  finalOrdered.forEach((item, index) => {
    item.no = index + 1;
  });

  return finalOrdered;
};

/**
 * Adds a new option to a field group
 */
export const createOptionService = async (userId, { field, value, label }) => {
  await checkSettingMastersEditable(userId);
  if (!field || !value) throw new Error("Field and value are required");
  const cleanField = normalizeFieldKey(field);
  const cleanValue = value.trim();
  const cleanLabel = label ? label.trim() : cleanValue;

  // Ensure defaults are already in DB so newly added option sits alongside defaults
  await ensureFieldDefaultsInDb(userId, cleanField);

  return await prisma.dropdownOption.upsert({
    where: {
      userId_field_value: {
        userId,
        field: cleanField,
        value: cleanValue,
      },
    },
    update: {
      label: cleanLabel,
      isActive: true,
    },
    create: {
      userId,
      field: cleanField,
      value: cleanValue,
      label: cleanLabel,
      isActive: true,
    },
  });
};

/**
 * Cascades an option update/rename to all existing entity records in DB
 */
export const cascadeUpdateRecords = async (userId, normField, oldValue, newValue) => {
  if (!oldValue || !newValue || oldValue.trim() === newValue.trim()) return;

  const oldVal = oldValue.trim();
  const newVal = newValue.trim();

  try {
    switch (normField) {
      case "category":
      case "productcategory":
      case "materialcategory":
        await Promise.all([
          prisma.product.updateMany({
            where: { userId, category: oldVal },
            data: { category: newVal },
          }),
          prisma.material.updateMany({
            where: { userId, category: oldVal },
            data: { category: newVal },
          }),
        ]);
        break;
      case "subcategory":
      case "productsubcategory":
      case "materialsubcategory":
        await Promise.all([
          prisma.product.updateMany({
            where: { userId, subCategory: oldVal },
            data: { subCategory: newVal },
          }),
          prisma.material.updateMany({
            where: { userId, subCategory: oldVal },
            data: { subCategory: newVal },
          }),
        ]);
        break;
      case "brand":
        await Promise.all([
          prisma.product.updateMany({
            where: { userId, brand: oldVal },
            data: { brand: newVal },
          }),
          prisma.material.updateMany({
            where: { userId, brand: oldVal },
            data: { brand: newVal },
          }),
        ]);
        break;
      case "unit":
        await Promise.all([
          prisma.product.updateMany({
            where: { userId, unit: oldVal },
            data: { unit: newVal },
          }),
          prisma.material.updateMany({
            where: { userId, unit: oldVal },
            data: { unit: newVal },
          }),
        ]);
        break;
      case "gender":
        await Promise.all([
          prisma.product.updateMany({
            where: { userId, gender: oldVal },
            data: { gender: newVal },
          }),
          prisma.user.updateMany({
            where: {
              gender: oldVal,
              OR: [
                { id: userId },
                { userMapping: { superAdminId: userId } },
                { userMapping: { adminId: userId } },
              ],
            },
            data: { gender: newVal },
          }),
        ]);
        break;
      case "referenceparty":
        await Promise.all([
          prisma.product.updateMany({
            where: { userId, referenceParty: oldVal },
            data: { referenceParty: newVal },
          }),
          prisma.material.updateMany({
            where: { userId, referenceParty: oldVal },
            data: { referenceParty: newVal },
          }),
        ]);
        break;
      case "rackaddress":
        await Promise.all([
          prisma.product.updateMany({
            where: { userId, rackAddress: oldVal },
            data: { rackAddress: newVal },
          }),
          prisma.material.updateMany({
            where: { userId, rackAddress: oldVal },
            data: { rackAddress: newVal },
          }),
          prisma.productVariant.updateMany({
            where: { product: { userId }, rackAddress: oldVal },
            data: { rackAddress: newVal },
          }),
          prisma.materialVariant.updateMany({
            where: { material: { userId }, rackAddress: oldVal },
            data: { rackAddress: newVal },
          }),
        ]);
        break;
      case "availability":
        await Promise.all([
          prisma.product.updateMany({
            where: { userId, availability: oldVal },
            data: { availability: newVal },
          }),
          prisma.material.updateMany({
            where: { userId, availability: oldVal },
            data: { availability: newVal },
          }),
        ]);
        break;
      case "manufacturinggroup":
        await prisma.material.updateMany({
          where: { userId, manufacturingGroup: oldVal },
          data: { manufacturingGroup: newVal },
        });
        break;
      case "costapplyingmode":
        await prisma.material.updateMany({
          where: { userId, costApplyingMode: oldVal },
          data: { costApplyingMode: newVal },
        });
        break;
      case "purchasetype":
        await prisma.material.updateMany({
          where: { userId, purchaseType: oldVal },
          data: { purchaseType: newVal },
        });
        break;
      case "issuemode":
        await prisma.material.updateMany({
          where: { userId, issueMode: oldVal },
          data: { issueMode: newVal },
        });
        break;
      case "consumptionmode":
        await prisma.material.updateMany({
          where: { userId, consumptionMode: oldVal },
          data: { consumptionMode: newVal },
        });
        break;
      case "foruse":
        await prisma.material.updateMany({
          where: { userId, forUse: oldVal },
          data: { forUse: newVal },
        });
        break;
      case "color": {
        const [productsWithColor, materialsWithColor] = await Promise.all([
          prisma.product.findMany({
            where: { userId, colors: { has: oldVal } },
            select: { id: true, colors: true },
          }).catch(() => []),
          prisma.material.findMany({
            where: { userId, colors: { has: oldVal } },
            select: { id: true, colors: true },
          }).catch(() => []),
        ]);
        for (const p of productsWithColor) {
          const updated = p.colors.map((c) => (c.toLowerCase() === oldVal.toLowerCase() ? newVal : c));
          await prisma.product.update({ where: { id: p.id }, data: { colors: updated } });
        }
        for (const m of materialsWithColor) {
          const updated = m.colors.map((c) => (c.toLowerCase() === oldVal.toLowerCase() ? newVal : c));
          await prisma.material.update({ where: { id: m.id }, data: { colors: updated } });
        }
        await Promise.all([
          prisma.productVariantAttribute.updateMany({
            where: {
              productVariant: { product: { userId } },
              productAttribute: { attributeName: { in: ["Colour", "colour", "Color", "color"] } },
              attributeValue: { equals: oldVal, mode: "insensitive" },
            },
            data: { attributeValue: newVal },
          }).catch(() => {}),
          prisma.materialVariantAttribute.updateMany({
            where: {
              materialVariant: { material: { userId } },
              materialAttribute: { attributeName: { in: ["Colour", "colour", "Color", "color"] } },
              attributeValue: { equals: oldVal, mode: "insensitive" },
            },
            data: { attributeValue: newVal },
          }).catch(() => {}),
        ]);
        break;
      }
      case "size": {
        const productsWithSize = await prisma.product.findMany({
          where: { userId, sizeList: { contains: oldVal, mode: "insensitive" } },
          select: { id: true, sizeList: true },
        }).catch(() => []);
        for (const p of productsWithSize) {
          if (p.sizeList) {
            const sizes = p.sizeList.split(",").map((s) => s.trim());
            const updated = sizes.map((s) => (s.toLowerCase() === oldVal.toLowerCase() ? newVal : s));
            await prisma.product.update({ where: { id: p.id }, data: { sizeList: updated.join(", ") } });
          }
        }
        await Promise.all([
          prisma.productVariantAttribute.updateMany({
            where: {
              productVariant: { product: { userId } },
              productAttribute: { attributeName: { in: ["Size", "size", "Sizes", "sizes"] } },
              attributeValue: { equals: oldVal, mode: "insensitive" },
            },
            data: { attributeValue: newVal },
          }).catch(() => {}),
          prisma.materialVariantAttribute.updateMany({
            where: {
              materialVariant: { material: { userId } },
              materialAttribute: { attributeName: { in: ["Size", "size", "Sizes", "sizes"] } },
              attributeValue: { equals: oldVal, mode: "insensitive" },
            },
            data: { attributeValue: newVal },
          }).catch(() => {}),
        ]);
        break;
      }
      case "gstrate": {
        const oldGst = parseFloat(oldVal.replace("%", ""));
        const newGst = parseFloat(newVal.replace("%", ""));
        if (!isNaN(oldGst) && !isNaN(newGst)) {
          await Promise.all([
            prisma.product.updateMany({
              where: { userId, gstRate: oldGst },
              data: { gstRate: newGst },
            }),
            prisma.material.updateMany({
              where: { userId, gstRate: oldGst },
              data: { gstRate: newGst },
            }),
          ]);
        }
        break;
      }
      case "marketplace": {
        const prods = await prisma.product.findMany({
          where: { userId, marketplaces: { has: oldVal } },
          select: { id: true, marketplaces: true },
        }).catch(() => []);
        for (const p of prods) {
          const updated = p.marketplaces.map((m) => (m.toLowerCase() === oldVal.toLowerCase() ? newVal : m));
          await prisma.product.update({ where: { id: p.id }, data: { marketplaces: updated } });
        }
        break;
      }
      case "company": {
        await prisma.company.updateMany({
          where: { userId, companyName: oldVal },
          data: { companyName: newVal },
        }).catch(() => {});

        const usersWithComp = await prisma.user.findMany({
          where: {
            companies: { has: oldVal },
            OR: [
              { id: userId },
              { userMapping: { superAdminId: userId } },
              { userMapping: { adminId: userId } },
            ],
          },
          select: { id: true, companies: true },
        });
        for (const u of usersWithComp) {
          const updatedComp = u.companies.map((c) => (c.toLowerCase() === oldVal.toLowerCase() ? newVal : c));
          await prisma.user.update({
            where: { id: u.id },
            data: { companies: updatedComp },
          });
        }
        break;
      }
      case "department": {
        const usersWithDept = await prisma.user.findMany({
          where: {
            departments: { has: oldVal },
            OR: [
              { id: userId },
              { userMapping: { superAdminId: userId } },
              { userMapping: { adminId: userId } },
            ],
          },
          select: { id: true, departments: true },
        });
        for (const u of usersWithDept) {
          const updatedDepts = u.departments.map((d) => (d.toLowerCase() === oldVal.toLowerCase() ? newVal : d));
          await prisma.user.update({
            where: { id: u.id },
            data: { departments: updatedDepts },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error(`cascadeUpdateRecords error for ${normField}:`, err);
  }
};

/**
 * Updates an option's value, label or active state
 */
export const updateOptionService = async (userId, id, { field, value, label, isActive, oldValue, oldLabel }) => {
  await checkSettingMastersEditable(userId);
  const normField = normalizeFieldKey(field);
  const cleanField = normField;
  const cleanValue = value ? value.trim() : "";
  const cleanLabel = label ? label.trim() : cleanValue;
  const cleanOldValue = oldValue ? oldValue.trim() : "";
  const cleanOldLabel = oldLabel ? oldLabel.trim() : "";

  // 1. Cascade update to existing records if value or label has changed
  if (cleanOldValue && cleanValue && cleanOldValue !== cleanValue) {
    await cascadeUpdateRecords(userId, normField, cleanOldValue, cleanValue);
  }
  if (cleanOldLabel && cleanLabel && cleanOldLabel !== cleanLabel) {
    await cascadeUpdateRecords(userId, normField, cleanOldLabel, cleanLabel);
  }

  // 2. If it's a default option override
  if (id && String(id).startsWith("default_")) {
    if (!cleanField || !cleanValue) throw new Error("Field and value are required for default override");

    // If default value was renamed, hide old default with __DELETED__ so it doesn't linger as duplicate
    if (cleanOldValue && cleanValue && cleanOldValue.toLowerCase() !== cleanValue.toLowerCase()) {
      await prisma.dropdownOption.upsert({
        where: {
          userId_field_value: {
            userId,
            field: cleanField,
            value: cleanOldValue,
          },
        },
        update: { label: "__DELETED__", isActive: false },
        create: {
          userId,
          field: cleanField,
          value: cleanOldValue,
          label: "__DELETED__",
          isActive: false,
        },
      });
    }

    return await prisma.dropdownOption.upsert({
      where: {
        userId_field_value: {
          userId,
          field: cleanField,
          value: cleanValue,
        },
      },
      update: {
        label: cleanLabel,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      create: {
        userId,
        field: cleanField,
        value: cleanValue,
        label: cleanLabel,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
  }

  // 3. It's a custom DB record (id exists in DropdownOption)
  let existing = null;
  if (id) {
    existing = await prisma.dropdownOption.findUnique({ where: { id } }).catch(() => null);
  }
  const effectiveOldValue = cleanOldValue || (existing ? existing.value : "");
  if (effectiveOldValue && cleanValue && effectiveOldValue !== cleanValue) {
    await cascadeUpdateRecords(userId, normField, effectiveOldValue, cleanValue);
  }

  // If new value already exists under another record for this user & field, merge them to avoid P2002 error
  if (cleanValue && existing && existing.value.toLowerCase() !== cleanValue.toLowerCase()) {
    const existingWithNewValue = await prisma.dropdownOption.findUnique({
      where: {
        userId_field_value: {
          userId,
          field: cleanField,
          value: cleanValue,
        },
      },
    }).catch(() => null);

    if (existingWithNewValue) {
      await prisma.dropdownOption.delete({ where: { id: existing.id } }).catch(() => {});
      return await prisma.dropdownOption.update({
        where: { id: existingWithNewValue.id },
        data: {
          label: cleanLabel,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
    }
  }

  return await prisma.dropdownOption.update({
    where: { id },
    data: {
      ...(cleanValue ? { value: cleanValue } : {}),
      ...(cleanLabel ? { label: cleanLabel } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    },
  });
};

/**
 * Quick toggle for isActive
 */
export const toggleOptionActiveService = async (userId, id, { field, value, isActive }) => {
  return await updateOptionService(userId, id, { field, value, isActive });
};

/**
 * Hard deletes an option from the database (DropdownOption table)
 */
export const deleteOptionService = async (userId, id, { field, value, label }) => {
  await checkSettingMastersEditable(userId);
  const normField = normalizeFieldKey(field);
  const cleanValue = value ? String(value).trim() : "";
  const cleanLabel = label ? String(label).trim() : "";

  // 1. Ensure field is marked initialized and defaults seeded before deleting, so deletions are permanently honored
  await ensureFieldDefaultsInDb(userId, normField);

  let targetValue = cleanValue;
  if (id && !String(id).startsWith("default_")) {
    const existing = await prisma.dropdownOption.findUnique({ where: { id } }).catch(() => null);
    if (existing) {
      targetValue = existing.value;
    }
  }

  if (!targetValue && !id) {
    throw new Error("Value or ID is required to delete option");
  }

  // 2. HARD DELETE from DropdownOption by primary key ID if an actual DB record exists
  if (id && !String(id).startsWith("default_")) {
    await prisma.dropdownOption.delete({
      where: { id },
    }).catch(() => null);
  }

  // 3. HARD DELETE from DropdownOption by userId + field + value/label to ensure complete removal from DB
  const deleteConditions = [];
  if (targetValue) {
    deleteConditions.push({ value: { equals: targetValue, mode: "insensitive" } });
    deleteConditions.push({ label: { equals: targetValue, mode: "insensitive" } });
  }
  if (cleanLabel && cleanLabel !== targetValue) {
    deleteConditions.push({ value: { equals: cleanLabel, mode: "insensitive" } });
    deleteConditions.push({ label: { equals: cleanLabel, mode: "insensitive" } });
  }

  const deleted = await prisma.dropdownOption.deleteMany({
    where: {
      userId,
      field: { in: [field, normField].filter(Boolean) },
      OR: deleteConditions,
    },
  }).catch(() => null);

  return { success: true, count: deleted?.count || 1 };
};

/**
 * Merges all built-in default dropdown options with user-created overrides/custom options from DB.
 * Returns an array of options with { id, field, value, label, isActive, isDefault }.
 */
export const getAllMasterDropdownOptionsService = async (userId) => {
  let dbOptions = [];
  try {
    dbOptions = await prisma.dropdownOption.findMany({
      where: {
        userId,
        NOT: { field: { in: Array.from(EXCLUDED_FIELDS) } },
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.warn("Initial query failed for master dropdown options, retrying once:", err.message);
    try {
      dbOptions = await prisma.dropdownOption.findMany({
        where: {
          userId,
          NOT: { field: { in: Array.from(EXCLUDED_FIELDS) } },
        },
        orderBy: { createdAt: "asc" },
      });
    } catch (retryErr) {
      console.error("Retry query also failed for master dropdown options:", retryErr.message);
    }
  }

  const isSeeded = await isWorkspaceDefaultsSeeded(userId);

  // Group DB options by normalized field -> Map(value.toLowerCase() -> opt) & Map(label.toLowerCase() -> opt)
  const dbOptionsByField = new Map();
  dbOptions.forEach((opt) => {
    const norm = normalizeFieldKey(opt.field);
    if (EXCLUDED_FIELDS.has(norm)) return;
    if (!dbOptionsByField.has(norm)) {
      dbOptionsByField.set(norm, new Map());
    }
    const fieldMap = dbOptionsByField.get(norm);
    if (opt.value) {
      fieldMap.set(String(opt.value).trim().toLowerCase(), opt);
    }
    if (opt.label) {
      fieldMap.set(String(opt.label).trim().toLowerCase(), opt);
    }
  });

  const merged = [];

  // Process all registered field groups
  Object.keys(BUILTIN_OTHER_DROPDOWNS).forEach((fieldKey) => {
    const norm = normalizeFieldKey(fieldKey);
    if (EXCLUDED_FIELDS.has(norm)) return;
    const config = BUILTIN_OTHER_DROPDOWNS[fieldKey];
    const fieldDbMap = dbOptionsByField.get(norm);

    if (fieldDbMap && fieldDbMap.size > 0) {
      // Group is driven directly by database records
      fieldDbMap.forEach((opt) => {
        merged.push({
          id: opt.id,
          field: fieldKey,
          value: opt.value,
          label: opt.label || opt.value,
          isActive: opt.isActive !== false,
          isDefault: (config.defaults || []).some(
            (d) => d.toLowerCase() === opt.value.toLowerCase() || d.toLowerCase() === (opt.label || "").toLowerCase()
          ),
        });
      });
    } else if (!isSeeded) {
      // Workspace not seeded yet; provide built-in defaults as initial view
      (config.defaults || []).forEach((defVal) => {
        merged.push({
          id: `default_${norm}_${defVal}`,
          field: fieldKey,
          value: defVal,
          label: defVal,
          isActive: true,
          isDefault: true,
        });
      });
    }
  });

  // Also include purely custom fields not in BUILTIN_OTHER_DROPDOWNS
  dbOptions.forEach((opt) => {
    const norm = normalizeFieldKey(opt.field);
    if (EXCLUDED_FIELDS.has(norm)) return;
    if (!BUILTIN_OTHER_DROPDOWNS[norm] && !merged.some((m) => m.id === opt.id)) {
      merged.push({
        id: opt.id,
        field: opt.field,
        value: opt.value,
        label: opt.label || opt.value,
        isActive: opt.isActive !== false,
        isDefault: false,
      });
    }
  });

  return merged;
};
