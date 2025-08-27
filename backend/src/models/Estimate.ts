import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum EstimateStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONVERTED = 'converted',
}

interface EstimateAttributes {
  id: string;
  customerId: string;
  deviceType: string;
  brand: string;
  model: string;
  issueDescription?: string;
  notes?: string;
  status: EstimateStatus;
  lineItems: any[]; // JSON array of { type: 'part'|'labor'|'misc', name, qty, unitPrice }
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  validityUntil?: Date;
  attachments?: any | null; // JSON array of file info
  repairOrderId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EstimateCreationAttributes
  extends Optional<EstimateAttributes, 'id' | 'attachments' | 'repairOrderId' | 'issueDescription' | 'notes' | 'validityUntil' | 'createdAt' | 'updatedAt' | 'lineItems'> {}

class Estimate
  extends Model<EstimateAttributes, EstimateCreationAttributes>
  implements EstimateAttributes {
  public id!: string;
  public customerId!: string;
  public deviceType!: string;
  public brand!: string;
  public model!: string;
  public issueDescription?: string | undefined;
  public notes?: string | undefined;
  public status!: EstimateStatus;
  public lineItems!: any[];
  public subtotal!: number;
  public tax!: number;
  public discount!: number;
  public total!: number;
  public validityUntil?: Date | undefined;
  public attachments?: any | null | undefined;
  public repairOrderId?: string | null | undefined;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Estimate.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    customerId: { type: DataTypes.UUID, allowNull: false },
    deviceType: { type: DataTypes.STRING, allowNull: false },
    brand: { type: DataTypes.STRING, allowNull: false },
    model: { type: DataTypes.STRING, allowNull: false },
    issueDescription: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(EstimateStatus)), allowNull: false, defaultValue: EstimateStatus.SENT },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    tax: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    lineItems: { type: DataTypes.JSONB as any, allowNull: true, defaultValue: [] },
    validityUntil: { type: DataTypes.DATE, allowNull: true },
    attachments: { type: DataTypes.JSONB as any, allowNull: true },
    repairOrderId: { type: DataTypes.UUID, allowNull: true },
  },
  { sequelize, modelName: 'Estimate', tableName: 'estimates', timestamps: true }
);

export default Estimate;
