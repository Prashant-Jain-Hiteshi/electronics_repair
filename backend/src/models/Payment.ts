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

interface PaymentAttributes {
  id: string;
  repairOrderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PaymentCreationAttributes
  extends Optional<
    PaymentAttributes,
    'id' | 'status' | 'transactionId' | 'paidAt' | 'notes' | 'createdAt' | 'updatedAt'
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
  public transactionId?: string | undefined;
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
    transactionId: { type: DataTypes.STRING, allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'Payment', tableName: 'payments', timestamps: true }
);

export default Payment;
