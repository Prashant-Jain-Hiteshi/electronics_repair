import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

export enum TransferStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

interface StockTransferAttributes {
  id: string
  fromLocationId: string
  toLocationId: string
  inventoryId: string
  quantity: number
  status: TransferStatus
  requestedBy?: string | null
  approvedBy?: string | null
  createdAt?: Date
  updatedAt?: Date
}

interface StockTransferCreationAttributes extends Optional<StockTransferAttributes, 'id' | 'status' | 'requestedBy' | 'approvedBy' | 'createdAt' | 'updatedAt'> {}

class StockTransfer extends Model<StockTransferAttributes, StockTransferCreationAttributes> implements StockTransferAttributes {
  public id!: string
  public fromLocationId!: string
  public toLocationId!: string
  public inventoryId!: string
  public quantity!: number
  public status!: TransferStatus
  public requestedBy?: string | null
  public approvedBy?: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

StockTransfer.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fromLocationId: { type: DataTypes.UUID, allowNull: false },
    toLocationId: { type: DataTypes.UUID, allowNull: false },
    inventoryId: { type: DataTypes.UUID, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(TransferStatus)), allowNull: false, defaultValue: TransferStatus.PENDING },
    requestedBy: { type: DataTypes.UUID, allowNull: true },
    approvedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    modelName: 'StockTransfer',
    tableName: 'stock_transfers',
    timestamps: true,
    indexes: [
      { name: 'idx_transfer_status', fields: ['status'] },
      { name: 'idx_transfer_from_to', fields: ['fromLocationId', 'toLocationId'] },
    ],
  }
)

export default StockTransfer
