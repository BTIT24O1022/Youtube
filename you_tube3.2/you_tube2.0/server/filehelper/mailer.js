import nodemailer from "nodemailer";

// Uses plain SMTP, so it works with a free Gmail "App Password" (no
// separate signup needed -- just a Google Account setting), or any other
// SMTP provider (Resend, SendGrid, Mailtrap, etc.) if you already have one.
// If SMTP isn't configured, this throws -- the caller decides how to handle
// that (e.g. log the OTP to the server console instead, for local testing).
const getTransport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS not set on the server");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

export const sendOtpEmail = async (toEmail, code) => {
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Your sign-in verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes. If you didn't try to sign in, you can ignore this email.`,
    html: `<p>Your verification code is <b style="font-size:20px">${code}</b>.</p><p>It expires in 10 minutes. If you didn't try to sign in, you can ignore this email.</p>`,
  });
};

export const sendInvoiceEmail = async (toEmail, invoice) => {
  const transport = getTransport();
  const amountDisplay = `₹${(invoice.amount / 100).toLocaleString("en-IN")}`;
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `Your ${invoice.plan} subscription receipt`,
    text: [
      `Thanks for subscribing to the ${invoice.plan} plan!`,
      `Invoice: ${invoice.invoiceNumber}`,
      `Amount: ${amountDisplay} (${invoice.billingCycle})`,
      `Payment ID: ${invoice.paymentId}`,
      `Valid until: ${invoice.expiry.toDateString()}`,
      "Questions? Reply to this email for support.",
    ].join("\n"),
    html: `
      <h2>Payment received — thank you!</h2>
      <p>You're now on the <b>${invoice.plan}</b> plan.</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0">Invoice</td><td>${invoice.invoiceNumber}</td></tr>
        <tr><td style="padding:4px 12px 4px 0">Amount</td><td>${amountDisplay} (${invoice.billingCycle})</td></tr>
        <tr><td style="padding:4px 12px 4px 0">Payment ID</td><td>${invoice.paymentId}</td></tr>
        <tr><td style="padding:4px 12px 4px 0">Valid until</td><td>${invoice.expiry.toDateString()}</td></tr>
      </table>
      <p>Questions? Reply to this email for support.</p>
    `,
  });
};
