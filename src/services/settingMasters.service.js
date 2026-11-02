import prisma from "../config/prisma.js";

// Normalize any field key to standard alphanumeric lowercase
export const normalizeFieldKey = (key) => {
  return String(key || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Comprehensive mapping of known normalized field keys to clean human labels
export const KNOWN_FIELD_LABELS = {
  advertisement: "Advertisement",
  agentbrokercontractor: "Agent/Broker/Contractor",
  bankac: "Bank A/C",
  basketgroups: "Basket Groups",
  baskets: "Baskets",
  buildings: "Buildings",
  capitalac: "Capital A/C",
  cashac: "Cash A/C",
  closingstock: "Closing Stock",
  color: "Color",
  company: "Company Name",
  dutiesandtaxes: "Duties And Taxes",
  employee: "Employee",
  employeedesignation: "Employee Designation",
  expenseac: "Expense A/C",
  expenseacpnl: "Expense A/C (P & L)",
  category: "Product Category",
  subcategory: "Product Sub-Category",
  brand: "Brand Name",
  unit: "Unit",
  size: "Size List",
  gender: "Gender",
  rackaddress: "Rack Address",
  availability: "Availability",
  gstrate: "GST Rate (%)",
  referenceparty: "Reference Party",
  manufacturinggroup: "Manufacturing Group",
  ledgergroup: "Ledger Group",
  costapplyingmode: "Cost Applying Mode",
  purchasetype: "Purchase Type",
  issuemode: "Issue Mode",
  consumptionmode: "Consumption Mode",
  department: "Department",
  branch: "Branch",
  challanfor: "Challan For",
};

// Humanize any camelCase, snake_case, or normalized field key
export const humanizeFieldKey = (rawKey) => {
  if (!rawKey) return "";
  const norm = normalizeFieldKey(rawKey);
  if (KNOWN_FIELD_LABELS[norm]) return KNOWN_FIELD_LABELS[norm];

  return rawKey
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

// Built-in registry with normalized lowercase keys
export const BUILTIN_OTHER_DROPDOWNS = {
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
  color: {
    label: "Color",
    defaults: [
      "White", "Black", "Green", "Red", "Sky-blue", "Cream", "Pink", "Maroon",
      "Blue", "Navy blue", "Gold", "Clear", "Silver", "Brown", "Teal",
      "Magenta", "Yellow", "Grey", "Charcoal", "Beige", "Olive", "Orange", "Purple"
    ],
  },
  company: {
    label: "Company Name",
    defaults: ["R.Code", "TOPLOT", "TAGDO", "Jay Bhavani Fashion"],
  },
  dutiesandtaxes: {
    label: "Duties And Taxes",
    defaults: ["GST Output (CGST/SGST/IGST)", "GST Input (ITC)", "TDS Payable", "TCS", "Customs Duty"],
  },
  employee: {
    label: "Employee",
    defaults: ["Salaried Employees", "Daily Wage Workers", "Contractors"],
  },
  employeedesignation: {
    label: "Employee Designation",
    defaults: ["Admin", "Master", "Computer Operator", "Manager", "Supervisor", "Staff", "Helper"],
  },
  expenseac: {
    label: "Expense A/C",
    defaults: ["Office Expense", "Freight & Cartage", "Utilities", "Rent", "Maintenance"],
  },
  expenseacpnl: {
    label: "Expense A/C (P & L)",
    defaults: ["Depreciation", "Bad Debts", "Legal & Professional Charges", "Audit Fees"],
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
  subcategory: {
    label: "Product Sub-Category",
    defaults: ["Shirts", "T-Shirts", "Jeans", "Trousers", "Dresses", "Kurtis", "Ethnic Wear"],
  },
  brand: {
    label: "Brand Name",
    defaults: ["No Brand", "R.Code", "TOPLOT", "TAGDO"],
  },
  unit: {
    label: "Unit",
    defaults: ["Pcs", "Set", "Box", "Dozen", "Meter", "Pair", "Kg"],
  },
  size: {
    label: "Size List",
    defaults: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "28", "30", "32", "34", "36", "38"],
  },
  gender: {
    label: "Gender",
    defaults: ["Men", "Women", "Boys", "Girls", "Kids", "Unisex"],
  },
  rackaddress: {
    label: "Rack Address",
    defaults: ["Floor Store", "Rack A1", "Rack A2", "Rack B1", "Rack B2", "Rack C1"],
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
    defaults: ["Direct Party", "Primary Vendor", "Job Worker"],
  },
  manufacturinggroup: {
    label: "Manufacturing Group",
    defaults: ["Raw Material", "Semi-Finished Goods", "Finished Goods", "Packing Material", "Trims & Accessories"],
  },
  ledgergroup: {
    label: "Ledger Group",
    defaults: ["Sundry Debtors", "Sundry Creditors", "Direct Expenses", "Indirect Expenses", "Sales Accounts"],
  },
  costapplyingmode: {
    label: "Cost Applying Mode",
    defaults: ["Average Cost", "FIFO", "LIFO", "Standard Cost", "Last Purchase Price"],
  },
  purchasetype: {
    label: "Purchase Type",
    defaults: ["Domestic", "Import", "Inter-State", "Local", "Job Work"],
  },
  issuemode: {
    label: "Issue Mode",
    defaults: ["FIFO", "Batch Wise", "Manual", "Direct Consumption"],
  },
  consumptionmode: {
    label: "Consumption Mode",
    defaults: ["Order Wise", "Batch Wise", "Periodic", "Standard BOM"],
  },
  department: {
    label: "Department",
    defaults: [
      "Admin", "Cutting", "Stitching", "Finishing", "Store", "Inventory",
      "Accounts", "Marketing & Sales", "Maintenance", "HR", "Computer Operator"
    ],
  },
  branch: {
    label: "Branch",
    defaults: ["JAY BHAVANI FASHION - Sachin", "JAY BHAVANI FASHION - Head Office", "Main Branch"],
  },
  challanfor: {
    label: "Challan For",
    defaults: ["Purchase", "Borrow (Uchhina)", "Sales", "Return", "Sample", "Job Work"],
  },
};

/**
 * Dynamically fetches all Field Groups (Strictly deduplicated via normalized keys)
 */
export const getFieldGroupsService = async (userId) => {
  // 1. Query distinct fields from DropdownOption in DB
  let dbFields = [];
  try {
    const distinct = await prisma.dropdownOption.findMany({
      where: { userId },
      select: { field: true },
      distinct: ["field"],
    });
    dbFields = distinct.map((d) => d.field);
  } catch (err) {
    console.error("Error querying distinct fields from DB:", err);
  }

  // 2. Fetch all user options to count options per group
  let userOptions = [];
  try {
    userOptions = await prisma.dropdownOption.findMany({
      where: { userId },
      select: { id: true, field: true, value: true, label: true, isActive: true },
    });
  } catch (err) {
    console.error("Error fetching user options:", err);
  }

  // 3. Build map of user options by normalized field
  const userOptionsByField = new Map();
  userOptions.forEach((opt) => {
    const norm = normalizeFieldKey(opt.field);
    if (!userOptionsByField.has(norm)) userOptionsByField.set(norm, []);
    userOptionsByField.get(norm).push(opt);
  });

  // 4. Combine built-in dropdowns + all dynamic fields from DB using normalized key
  const fieldKeyMap = new Map();

  // Add all built-in definitions
  Object.keys(BUILTIN_OTHER_DROPDOWNS).forEach((key) => {
    const norm = normalizeFieldKey(key);
    fieldKeyMap.set(norm, {
      field: key,
      label: BUILTIN_OTHER_DROPDOWNS[key].label,
      defaults: BUILTIN_OTHER_DROPDOWNS[key].defaults,
    });
  });

  // Merge DB fields: if normalized key exists, reuse it; otherwise create dynamic entry
  dbFields.forEach((dbField) => {
    const norm = normalizeFieldKey(dbField);
    if (!fieldKeyMap.has(norm)) {
      fieldKeyMap.set(norm, {
        field: dbField,
        label: humanizeFieldKey(dbField),
        defaults: [],
      });
    }
  });

  const groups = Array.from(fieldKeyMap.entries()).map(([normKey, config], index) => {
    const customForField = userOptionsByField.get(normKey) || [];
    const customValuesMap = new Map();
    customForField.forEach((o) => customValuesMap.set(o.value.toLowerCase(), o));

    let totalCount = config.defaults.length;
    let activeCount = config.defaults.filter((defVal) => {
      const custom = customValuesMap.get(defVal.toLowerCase());
      return custom ? custom.isActive !== false : true;
    }).length;

    // Add purely custom items (not in defaults)
    customForField.forEach((custom) => {
      if (!config.defaults.some((d) => d.toLowerCase() === custom.value.toLowerCase())) {
        totalCount++;
        if (custom.isActive !== false) activeCount++;
      }
    });

    return {
      id: config.field,
      no: index + 1,
      field: config.field,
      label: config.label,
      totalCount,
      activeCount,
    };
  });

  return groups;
};

/**
 * Fetches all options for a specific field group (merging defaults with DB overrides/customs)
 */
export const getFieldOptionsService = async (userId, field) => {
  if (!field) throw new Error("Field parameter is required");
  const normField = normalizeFieldKey(field);

  const builtin = BUILTIN_OTHER_DROPDOWNS[normField];
  const defaults = builtin ? builtin.defaults : [];

  let dbOptions = [];
  try {
    // Query matching by field (or normalized regex/case-insensitive)
    dbOptions = await prisma.dropdownOption.findMany({
      where: {
        userId,
        field: { equals: field, mode: "insensitive" },
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.error(`Error querying options for field ${field}:`, err);
  }

  const dbOptionsMap = new Map();
  dbOptions.forEach((o) => {
    dbOptionsMap.set(o.value.toLowerCase(), o);
  });

  const merged = [];
  let counter = 1;

  // Process defaults first
  defaults.forEach((defVal) => {
    const existing = dbOptionsMap.get(defVal.toLowerCase());
    merged.push({
      id: existing ? existing.id : `default_${normField}_${defVal}`,
      no: counter++,
      field,
      value: existing ? existing.value : defVal,
      label: existing ? existing.label : defVal,
      isActive: existing ? (existing.isActive !== false) : true,
      isDefault: true,
      createdAt: existing ? existing.createdAt : null,
    });
  });

  // Append user-created custom options not in defaults
  dbOptions.forEach((dbOpt) => {
    if (!defaults.some((d) => d.toLowerCase() === dbOpt.value.toLowerCase())) {
      merged.push({
        id: dbOpt.id,
        no: counter++,
        field,
        value: dbOpt.value,
        label: dbOpt.label,
        isActive: dbOpt.isActive !== false,
        isDefault: false,
        createdAt: dbOpt.createdAt,
      });
    }
  });

  return merged;
};

/**
 * Adds a new option to a field group
 */
export const createOptionService = async (userId, { field, value, label }) => {
  if (!field || !value) throw new Error("Field and value are required");
  const cleanField = field.trim().toLowerCase();
  const cleanValue = value.trim();
  const cleanLabel = label ? label.trim() : cleanValue;

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
        await prisma.product.updateMany({
          where: { userId, referenceParty: oldVal },
          data: { referenceParty: newVal },
        });
        break;
      case "rackaddress":
        await prisma.product.updateMany({
          where: { userId, rackAddress: oldVal },
          data: { rackAddress: newVal },
        });
        break;
      case "availability":
        await prisma.product.updateMany({
          where: { userId, availability: oldVal },
          data: { availability: newVal },
        });
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
          const updatedComp = u.companies.map((c) => (c === oldVal ? newVal : c));
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
          const updatedDepts = u.departments.map((d) => (d === oldVal ? newVal : d));
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
export const updateOptionService = async (userId, id, { field, value, label, isActive, oldValue }) => {
  const normField = normalizeFieldKey(field);
  const cleanField = field ? field.trim().toLowerCase() : normField;
  const cleanValue = value ? value.trim() : "";
  const cleanLabel = label ? label.trim() : cleanValue;
  const cleanOldValue = oldValue ? oldValue.trim() : "";

  // 1. Cascade update to existing records if value has changed
  if (cleanOldValue && cleanValue && cleanOldValue !== cleanValue) {
    await cascadeUpdateRecords(userId, normField, cleanOldValue, cleanValue);
  }

  // 2. If it's a default option override
  if (id && String(id).startsWith("default_")) {
    if (!cleanField || !cleanValue) throw new Error("Field and value are required for default override");

    // If default value was renamed, deactivate the old default so it doesn't linger as a ghost option
    if (cleanOldValue && cleanValue && cleanOldValue !== cleanValue) {
      await prisma.dropdownOption.upsert({
        where: {
          userId_field_value: {
            userId,
            field: cleanField,
            value: cleanOldValue,
          },
        },
        update: { isActive: false },
        create: {
          userId,
          field: cleanField,
          value: cleanOldValue,
          label: cleanOldValue,
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
 * Deletes a custom option or deactivates a default option
 */
export const deleteOptionService = async (userId, id, { field, value }) => {
  if (id && String(id).startsWith("default_")) {
    return await updateOptionService(userId, id, { field, value, isActive: false });
  }

  return await prisma.dropdownOption.delete({
    where: { id },
  });
};
