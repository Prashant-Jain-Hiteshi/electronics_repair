import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

export interface CustomerDeviceAttrs {
  id: string
  customerId: string
  deviceType: string
  brand: string
  model: string
  serialNumber?: string | null
  notes?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export type CustomerDeviceCreation = Optional<CustomerDeviceAttrs, 'id' | 'serialNumber' | 'notes' | 'createdAt' | 'updatedAt'>

class CustomerDevice extends Model<CustomerDeviceAttrs, CustomerDeviceCreation> implements CustomerDeviceAttrs {
  public id!: string
  public customerId!: string
  public deviceType!: string
  public brand!: string
  public model!: string
  public serialNumber!: string | null
  public notes!: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CustomerDevice.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customerId: { type: DataTypes.UUID, allowNull: false },
    deviceType: { type: DataTypes.STRING, allowNull: false },
    brand: { type: DataTypes.STRING, allowNull: false },
    model: { type: DataTypes.STRING, allowNull: false },
    serialNumber: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'customer_devices', modelName: 'CustomerDevice' }
)

export default CustomerDevice
