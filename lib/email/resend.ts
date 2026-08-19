export { htmlEscape, sendBrevoEmail } from "@/lib/email/brevo";

// Compatibilidade temporária com imports antigos. O envio real é feito exclusivamente pela Brevo.
export { sendBrevoEmail as sendResendEmail } from "@/lib/email/brevo";
