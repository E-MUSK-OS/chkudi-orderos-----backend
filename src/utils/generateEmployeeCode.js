import prisma from "../config/prisma.js";

export const generateEmployeeCode = async (operatorName) => {
  const prefix = operatorName
    .trim()
    .split(" ")[0]
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  let employeeCode = "";
  let exists = true;

  while (exists) {
    const randomNumber = Math.floor(
      1000 + Math.random() * 9000
    );

    employeeCode = `${prefix}#${randomNumber}`;

    const operator = await prisma.operator.findUnique({
      where: {
        employeeCode,
      },
    });

    exists = !!operator;
  }

  return employeeCode;
};