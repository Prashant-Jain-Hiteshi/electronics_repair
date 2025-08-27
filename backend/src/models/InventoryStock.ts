import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

interface InventoryStockAttributes {
  id: string
  inventoryId: string
  locationId: string
  quantity: number
  createdAt?: Date
  updatedAt?: Date
}

interface InventoryStockCreationAttributes extends Optional<InventoryStockAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class InventoryStock extends Model<InventoryStockAttributes, InventoryStockCreationAttributes> implements InventoryStockAttributes {
  public id!: string
  public inventoryId!: string
  public locationId!: string
  public quantity!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

InventoryStock.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inventoryId: { type: DataTypes.UUID, allowNull: false },
    locationId: { type: DataTypes.UUID, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'InventoryStock',
    tableName: 'inventory_stocks',
    timestamps: true,
    indexes: [
      { name: 'idx_inventory_stock_inv_loc', unique: true, fields: ['inventoryId', 'locationId'] },
      { name: 'idx_inventory_stock_location', fields: ['locationId'] },
    ],
  }
)

export default InventoryStock
