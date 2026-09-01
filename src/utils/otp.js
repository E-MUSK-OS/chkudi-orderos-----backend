import crypto from "crypto";

export const generateOTP = (length = 6) => {

  let otp = "";

  while (otp.length < length) {

    otp += crypto.randomInt(0, 10);

  }

  return otp;

};