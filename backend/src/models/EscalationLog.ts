import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type EscalationLevel = 'at_risk' | 'breach';

export interface EscalationLogAttributes {
  id: string;
  repairOrderId: string;
  level: EscalationLevel;
  technicianId?: string | null;
  managerId?: string | null; // using admin role as manager
  note?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EscalationLogCreationAttributes
  extends Optional<EscalationLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class EscalationLog extends Model<EscalationLogAttributes, EscalationLogCreationAttributes>
  implements EscalationLogAttributes {
  public id!: string;
  public repairOrderId!: string;
  public level!: EscalationLevel;
  public technicianId?: string | null;
  public managerId?: string | null;
  public note?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EscalationLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    repairOrderId: { type: DataTypes.UUID, allowNull: false },
    level: { type: DataTypes.ENUM('at_risk', 'breach'), allowNull: false },
    technicianId: { type: DataTypes.UUID, allowNull: true },
    managerId: { type: DataTypes.UUID, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'EscalationLog',
    tableName: 'escalation_logs',
    timestamps: true,
    indexes: [
      { name: 'idx_escalation_repair_time', fields: ['repairOrderId', 'createdAt'] },
      { name: 'idx_escalation_level_time', fields: ['level', 'createdAt'] },
    ],
  }
);

export default EscalationLog;
