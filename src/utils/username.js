import prisma from "../config/prisma.js";

export const generateUniqueUsername = async (fullName) => {

  const base = fullName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  let username;

  let exists = true;

  while (exists) {

    const random = Math.floor(1000 + Math.random() * 9000);

    username = `${base}_${random}`;

    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    exists = !!user;
  }

  return username;
};