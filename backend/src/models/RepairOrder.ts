import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum RepairStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  AWAITING_PARTS = 'awaiting_parts',
  COMPLETED = 'completed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

interface RepairOrderAttributes {
  id: string;
  customerId: string;
  technicianId?: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  issueDescription: string;
  diagnosis?: string;
  repairNotes?: string;
  status: RepairStatus;
  priority: Priority;
  estimatedCost?: number;
  actualCost?: number;
  estimatedCompletionDate?: Date;
  actualCompletionDate?: Date;
  warrantyPeriod?: number; // days
  createdAt?: Date;
  updatedAt?: Date;
}

interface RepairOrderCreationAttributes
  extends Optional<RepairOrderAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class RepairOrder
  extends Model<RepairOrderAttributes, RepairOrderCreationAttributes>
  implements RepairOrderAttributes
{
  public id!: string;
  public customerId!: string;
  public technicianId?: string | undefined;
  public deviceType!: string;
  public brand!: string;
  public model!: string;
  public serialNumber?: string | undefined;
  public issueDescription!: string;
  public diagnosis?: string | undefined;
  public repairNotes?: string | undefined;
  public status!: RepairStatus;
  public priority!: Priority;
  public estimatedCost?: number | undefined;
  public actualCost?: number | undefined;
  public estimatedCompletionDate?: Date | undefined;
  public actualCompletionDate?: Date | undefined;
  public warrantyPeriod?: number | undefined;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RepairOrder.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
    },
    technicianId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    deviceType: { type: DataTypes.STRING, allowNull: false },
    brand: { type: DataTypes.STRING, allowNull: false },
    model: { type: DataTypes.STRING, allowNull: false },
    serialNumber: { type: DataTypes.STRING, allowNull: true },
    issueDescription: { type: DataTypes.TEXT, allowNull: false },
    diagnosis: { type: DataTypes.TEXT, allowNull: true },
    repairNotes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM(...Object.values(RepairStatus)),
      allowNull: false,
      defaultValue: RepairStatus.PENDING,
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(Priority)),
      allowNull: false,
      defaultValue: Priority.MEDIUM,
    },
    estimatedCost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    actualCost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    estimatedCompletionDate: { type: DataTypes.DATE, allowNull: true },
    actualCompletionDate: { type: DataTypes.DATE, allowNull: true },
    warrantyPeriod: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 30 },
  },
  { sequelize, modelName: 'RepairOrder', tableName: 'repair_orders', timestamps: true }
);

export default RepairOrder;
