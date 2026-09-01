export const otpTemplate = ({
  fullName,
  otp,
  title,
  message,
}) => {
  return `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">

<style>

body{
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,sans-serif;
}

.container{
    width:600px;
    margin:auto;
    background:#ffffff;
}

.header{
    background:#111827;
    color:#ffffff;
    padding:30px;
    text-align:center;
}

.content{
    padding:40px;
}

.otp{
    font-size:34px;
    font-weight:bold;
    letter-spacing:8px;
    text-align:center;
    color:#2563eb;
    margin:35px 0;
}

.footer{
    padding:30px;
    text-align:center;
    color:#777;
    font-size:13px;
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>Chkudi OrderOS</h1>

</div>

<div class="content">

<h2>Hello ${fullName},</h2>

<p>

Use the OTP below to verify your email.

</p>

<div class="otp">

${otp}

</div>

<p>

This OTP is valid for only <b>5 minutes</b>.

</p>

<p>

If you didn't request this code,
you can safely ignore this email.

</p>

</div>

<div class="footer">

© ${new Date().getFullYear()} Chkudi OrderOS

</div>

</div>

</body>

</html>
`;
};
