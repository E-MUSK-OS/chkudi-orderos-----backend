import nodemailer from "nodemailer";

// console.log("SMTP_EMAIL ===>", process.env.SMTP_EMAIL);
// console.log("SMTP_PASSWORD ===>", process.env.SMTP_PASSWORD);

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendMail = async ({
  to,
  subject,
  html,
}) => {
  await transporter.sendMail({
    from: `"Chkudi OrderOS" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html,
  });
};