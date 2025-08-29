import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

export enum WarrantyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

interface WarrantyAttrs {
  id: string
  repairOrderId: string
  customerId: string
  startAt: Date
  endAt: Date
  periodDays: number
  status: WarrantyStatus
  terms?: string | null
  createdAt?: Date
  updatedAt?: Date
}

type WarrantyCreation = Optional<WarrantyAttrs, 'id' | 'status' | 'terms' | 'createdAt' | 'updatedAt'>

class Warranty extends Model<WarrantyAttrs, WarrantyCreation> implements WarrantyAttrs {
  public id!: string
  public repairOrderId!: string
  public customerId!: string
  public startAt!: Date
  public endAt!: Date
  public periodDays!: number
  public status!: WarrantyStatus
  public terms!: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Warranty.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    repairOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    periodDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(WarrantyStatus)),
      allowNull: false,
      defaultValue: WarrantyStatus.ACTIVE,
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { sequelize, tableName: 'warranties', modelName: 'Warranty' }
)

export default Warranty
