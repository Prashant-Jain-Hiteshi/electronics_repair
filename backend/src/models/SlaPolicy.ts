import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface SlaPolicyAttributes {
  id: string;
  deviceType: string; // e.g., 'mobile', 'laptop'
  priority: string;   // matches Priority enum values in RepairOrder
  resolutionHours: number; // total hours allowed to complete
  atRiskThresholdPct: number; // 0-100, when to flag "At Risk"
  createdAt?: Date;
  updatedAt?: Date;
}

interface SlaPolicyCreationAttributes
  extends Optional<SlaPolicyAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class SlaPolicy extends Model<SlaPolicyAttributes, SlaPolicyCreationAttributes>
  implements SlaPolicyAttributes {
  public id!: string;
  public deviceType!: string;
  public priority!: string;
  public resolutionHours!: number;
  public atRiskThresholdPct!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SlaPolicy.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    deviceType: { type: DataTypes.STRING, allowNull: false },
    priority: { type: DataTypes.STRING, allowNull: false },
    resolutionHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 48 },
    atRiskThresholdPct: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 80 },
  },
  {
    sequelize,
    modelName: 'SlaPolicy',
    tableName: 'sla_policies',
    timestamps: true,
    indexes: [
      { name: 'idx_sla_policy_device_priority', unique: true, fields: ['deviceType', 'priority'] },
    ],
  }
);

export default SlaPolicy;
