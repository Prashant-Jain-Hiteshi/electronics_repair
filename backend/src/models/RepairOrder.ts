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
  locationId?: string | null;
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
  // QA/Checklist fields
  checklist?: any | null; // JSON array of { id, label, pass, notes? }
  checklistPassed?: boolean | null;
  checklistByUserId?: string | null;
  checklistAt?: Date | null;
  qaRequired?: boolean; // if true, requires admin QA approval before completion
  qaApproved?: boolean | null;
  qaByUserId?: string | null;
  qaAt?: Date | null;
  qaNotes?: string | null;
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
  public locationId?: string | null;
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
  // QA/Checklist fields
  public checklist?: any | null | undefined;
  public checklistPassed?: boolean | null | undefined;
  public checklistByUserId?: string | null | undefined;
  public checklistAt?: Date | null | undefined;
  public qaRequired?: boolean | undefined;
  public qaApproved?: boolean | null | undefined;
  public qaByUserId?: string | null | undefined;
  public qaAt?: Date | null | undefined;
  public qaNotes?: string | null | undefined;
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
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'locations', key: 'id' },
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
    // QA/Checklist storage
    checklist: { type: (DataTypes as any).JSONB || DataTypes.JSON, allowNull: true },
    checklistPassed: { type: DataTypes.BOOLEAN, allowNull: true },
    checklistByUserId: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    checklistAt: { type: DataTypes.DATE, allowNull: true },
    qaRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    qaApproved: { type: DataTypes.BOOLEAN, allowNull: true },
    qaByUserId: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    qaAt: { type: DataTypes.DATE, allowNull: true },
    qaNotes: { type: DataTypes.TEXT, allowNull: true },
  },
  { 
    sequelize, 
    modelName: 'RepairOrder', 
    tableName: 'repair_orders', 
    timestamps: true,
    indexes: [
      {
        name: 'idx_repair_orders_status_priority_customer',
        fields: ['status', 'priority', 'customerId'],
      },
      {
        name: 'idx_repair_orders_location',
        fields: ['locationId'],
      },
    ],
  }
);

export default RepairOrder;
