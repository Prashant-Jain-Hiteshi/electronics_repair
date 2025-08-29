import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum ApprovalType {
  ESTIMATE = 'estimate',
  EXTRA_PARTS = 'extra_parts',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

interface ApprovalRequestAttributes {
  id: string;
  repairOrderId: string;
  customerId: string;
  type: ApprovalType;
  status: ApprovalStatus;
  title?: string | null;
  message?: string | null;
  items?: any | null; // JSON: array of line items or parts proposed
  amountDelta?: number | null; // additional cost requested
  token?: string | null; // signed token for public approval link
  tokenExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ApprovalRequestCreationAttributes
  extends Optional<
    ApprovalRequestAttributes,
    'id' | 'status' | 'title' | 'message' | 'items' | 'amountDelta' | 'token' | 'tokenExpiresAt' | 'createdAt' | 'updatedAt'
  > {}

class ApprovalRequest
  extends Model<ApprovalRequestAttributes, ApprovalRequestCreationAttributes>
  implements ApprovalRequestAttributes
{
  public id!: string;
  public repairOrderId!: string;
  public customerId!: string;
  public type!: ApprovalType;
  public status!: ApprovalStatus;
  public title?: string | null;
  public message?: string | null;
  public items?: any | null;
  public amountDelta?: number | null;
  public token?: string | null;
  public tokenExpiresAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ApprovalRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    repairOrderId: { type: DataTypes.UUID, allowNull: false, references: { model: 'repair_orders', key: 'id' } },
    customerId: { type: DataTypes.UUID, allowNull: false, references: { model: 'customers', key: 'id' } },
    type: { type: DataTypes.ENUM(...Object.values(ApprovalType)), allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(ApprovalStatus)), allowNull: false, defaultValue: ApprovalStatus.PENDING },
    title: { type: DataTypes.STRING, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    items: { type: (DataTypes as any).JSONB || DataTypes.JSON, allowNull: true },
    amountDelta: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    token: { type: DataTypes.STRING, allowNull: true },
    tokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'ApprovalRequest',
    tableName: 'approval_requests',
    timestamps: true,
    indexes: [
      { name: 'idx_approvals_repair_order', fields: ['repairOrderId'] },
      { name: 'idx_approvals_customer', fields: ['customerId'] },
      { name: 'idx_approvals_status', fields: ['status'] },
    ],
  }
);

export default ApprovalRequest;
