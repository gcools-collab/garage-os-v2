export const PAYMENT_STATUSES=["CREATED","PENDING","PAID","FAILED","CANCELLED","EXPIRED","PARTIALLY_REFUNDED","REFUNDED"]as const
export type PaymentStatus=typeof PAYMENT_STATUSES[number]
export type PaymentRecord=Readonly<{id:string;garageId:string;appointmentId:string;provider:string;providerPaymentId:string|null;status:PaymentStatus;amountCents:number;currency:string;paymentStrategy:string;isLive:boolean;hostedPaymentUrl:string|null;createdAt:string;paidAt:string|null;expiresAt:string|null;metadata:Readonly<Record<string,unknown>>}>
export type ProviderPayment=Readonly<{id:string;status:PaymentStatus;amountCents:number;currency:string;isLive:boolean;paymentUrl:string|null;paidAt:string|null;expiresAt:string|null;metadata:Readonly<Record<string,unknown>>}>
