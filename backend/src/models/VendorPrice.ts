import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

interface VendorPriceAttributes {
  id: string
  inventoryId: string
  vendor: string
  currencyCode?: string | null
  price: number
  validFrom?: Date | null
  validTo?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

interface VendorPriceCreationAttributes extends Optional<VendorPriceAttributes, 'id' | 'currencyCode' | 'validFrom' | 'validTo' | 'createdAt' | 'updatedAt'> {}

class VendorPrice extends Model<VendorPriceAttributes, VendorPriceCreationAttributes> implements VendorPriceAttributes {
  public id!: string
  public inventoryId!: string
  public vendor!: string
  public currencyCode?: string | null
  public price!: number
  public validFrom?: Date | null
  public validTo?: Date | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

VendorPrice.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inventoryId: { type: DataTypes.UUID, allowNull: false },
    vendor: { type: DataTypes.STRING, allowNull: false },
    currencyCode: { type: DataTypes.STRING(3), allowNull: true },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    validFrom: { type: DataTypes.DATE, allowNull: true },
    validTo: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'VendorPrice',
    tableName: 'vendor_prices',
    timestamps: true,
    indexes: [
      { name: 'idx_vendor_price_inventory', fields: ['inventoryId'] },
      { name: 'idx_vendor_price_vendor', fields: ['vendor'] },
    ],
  }
)

export default VendorPrice
