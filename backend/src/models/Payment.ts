import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentKind {
  DEPOSIT = 'deposit',
  PARTIAL = 'partial',
  FINAL = 'final',
  REFUND = 'refund',
}

export enum PaymentProvider {
  MANUAL = 'manual',
  STRIPE = 'stripe',
  UPI = 'upi',
}

interface PaymentAttributes {
  id: string;
  repairOrderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  kind?: PaymentKind;
  provider?: PaymentProvider;
  currencyCode?: string;
  transactionId?: string;
  intentId?: string | null;
  linkUrl?: string | null;
  paidAt?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PaymentCreationAttributes
  extends Optional<
    PaymentAttributes,
    'id' | 'status' | 'transactionId' | 'paidAt' | 'notes' | 'createdAt' | 'updatedAt' | 'kind' | 'provider' | 'currencyCode' | 'intentId' | 'linkUrl'
  > {}

class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  public id!: string;
  public repairOrderId!: string;
  public amount!: number;
  public method!: PaymentMethod;
  public status!: PaymentStatus;
  public kind?: PaymentKind | undefined;
  public provider?: PaymentProvider | undefined;
  public currencyCode?: string | undefined;
  public transactionId?: string | undefined;
  public intentId?: string | null | undefined;
  public linkUrl?: string | null | undefined;
  public paidAt?: Date | undefined;
  public notes?: string | undefined;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    repairOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'repair_orders', key: 'id' },
    },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    method: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
      allowNull: false,
      defaultValue: PaymentMethod.CASH,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      allowNull: false,
      defaultValue: PaymentStatus.COMPLETED,
    },
    kind: {
      type: DataTypes.ENUM(...Object.values(PaymentKind)),
      allowNull: true,
    },
    provider: {
      type: DataTypes.ENUM(...Object.values(PaymentProvider)),
      allowNull: true,
      defaultValue: PaymentProvider.MANUAL,
    },
    currencyCode: { type: DataTypes.STRING(8), allowNull: true },
    transactionId: { type: DataTypes.STRING, allowNull: true },
    intentId: { type: DataTypes.STRING, allowNull: true },
    linkUrl: { type: DataTypes.TEXT, allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'Payment', tableName: 'payments', timestamps: true }
);

export default Payment;
