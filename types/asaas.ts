export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

export type AsaasSubscriptionCycle =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

export type AsaasCustomer = {
  id: string;
  name: string;
  email?: string;
  cpfCnpj?: string;
  phone?: string;
  mobilePhone?: string;
};

export type AsaasCreditCardInfo = {
  creditCardNumber?: string;
  creditCardBrand?: string;
  creditCardToken?: string;
};

export type AsaasPayment = {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  originalValue?: number;
  interestValue?: number | null;
  billingType: AsaasBillingType;
  status: string;
  dueDate: string;
  originalDueDate?: string;
  description?: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  transactionReceiptUrl?: string | null;
  externalReference?: string | null;
  deleted?: boolean;
  dateCreated?: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  installmentNumber?: number | null;
  invoiceNumber?: string | null;
  nossoNumero?: string | null;
  subscription?: string | null;
  creditCard?: AsaasCreditCardInfo | null;
};

export type AsaasSubscription = {
  id: string;
  customer?: string;
  billingType?: AsaasBillingType | string;
  value?: number;
  nextDueDate?: string;
  cycle?: AsaasSubscriptionCycle | string;
  description?: string;
  status?: string;
  externalReference?: string | null;
  deleted?: boolean;
};

export type AsaasPixQrCode = {
  success: boolean;
  encodedImage: string;
  payload: string;
  expirationDate?: string;
};

export type AsaasWebhookPayment = {
  object?: string;
  id: string;
  dateCreated?: string;
  customer?: string;
  subscription?: string | null;
  paymentLink?: string | null;
  value?: number;
  netValue?: number;
  originalValue?: number | null;
  interestValue?: number | null;
  description?: string;
  billingType?: AsaasBillingType | string;
  status?: string;
  dueDate?: string;
  originalDueDate?: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
  bankSlipUrl?: string | null;
  transactionReceiptUrl?: string | null;
  externalReference?: string | null;
  deleted?: boolean;
  installmentNumber?: number | null;
  nossoNumero?: string | null;
  creditCard?: AsaasCreditCardInfo | null;
};

export type AsaasWebhookBody = {
  event: string;
  payment?: AsaasWebhookPayment;
};
