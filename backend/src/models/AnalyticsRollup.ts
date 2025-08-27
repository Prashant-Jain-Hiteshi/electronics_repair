import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

interface AnalyticsRollupAttributes {
  id: string
  metric: string // e.g., revenue.daily
  bucket: Date // start of period
  value: number
  meta?: object | null
  createdAt?: Date
  updatedAt?: Date
}

interface AnalyticsRollupCreationAttributes extends Optional<AnalyticsRollupAttributes, 'id' | 'createdAt' | 'updatedAt' | 'meta'> {}

class AnalyticsRollup extends Model<AnalyticsRollupAttributes, AnalyticsRollupCreationAttributes> implements AnalyticsRollupAttributes {
  public id!: string
  public metric!: string
  public bucket!: Date
  public value!: number
  public meta?: object | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

AnalyticsRollup.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    metric: { type: DataTypes.STRING, allowNull: false },
    bucket: { type: DataTypes.DATE, allowNull: false },
    value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    meta: { type: DataTypes.JSONB, allowNull: true },
  },
  {
    sequelize,
    modelName: 'AnalyticsRollup',
    tableName: 'analytics_rollups',
    timestamps: true,
    indexes: [
      { unique: true, name: 'uniq_rollup_metric_bucket', fields: ['metric', 'bucket'] },
      { name: 'idx_rollup_metric', fields: ['metric'] },
    ],
  }
)

export default AnalyticsRollup
