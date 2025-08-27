import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

interface LocationAttributes {
  id: string
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  createdAt?: Date
  updatedAt?: Date
}

interface LocationCreationAttributes extends Optional<LocationAttributes, 'id' | 'address' | 'city' | 'state' | 'country' | 'createdAt' | 'updatedAt'> {}

class Location extends Model<LocationAttributes, LocationCreationAttributes> implements LocationAttributes {
  public id!: string
  public name!: string
  public address?: string | null
  public city?: string | null
  public state?: string | null
  public country?: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Location.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    address: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Location',
    tableName: 'locations',
    timestamps: true,
    indexes: [{ name: 'idx_location_name', unique: true, fields: ['name'] }],
  }
)

export default Location
