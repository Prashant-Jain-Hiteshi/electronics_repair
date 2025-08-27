import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

export type UsageReason = 'usage' | 'restock' | 'adjustment' | 'reversal'

interface InventoryUsageAttributes {
  id: string
  inventoryId: string
  repairOrderId?: string | null
  quantityChange: number // negative for deduction, positive for addition
  reason: UsageReason
  note?: string | null
  createdBy?: string | null // userId
  createdAt?: Date
  updatedAt?: Date
}

interface InventoryUsageCreationAttributes
  extends Optional<InventoryUsageAttributes, 'id' | 'repairOrderId' | 'note' | 'createdBy' | 'createdAt' | 'updatedAt'> {}

class InventoryUsage
  extends Model<InventoryUsageAttributes, InventoryUsageCreationAttributes>
  implements InventoryUsageAttributes
{
  public id!: string
  public inventoryId!: string
  public repairOrderId?: string | null
  public quantityChange!: number
  public reason!: UsageReason
  public note?: string | null
  public createdBy?: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

InventoryUsage.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inventoryId: { type: DataTypes.UUID, allowNull: false },
    repairOrderId: { type: DataTypes.UUID, allowNull: true },
    quantityChange: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.ENUM('usage', 'restock', 'adjustment', 'reversal'), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
  },
  { 
    sequelize, 
    modelName: 'InventoryUsage', 
    tableName: 'inventory_usage', 
    timestamps: true,
    indexes: [
      { name: 'idx_inventory_usage_repair_order', fields: ['repairOrderId'] },
    ],
  }
)

export default InventoryUsage
