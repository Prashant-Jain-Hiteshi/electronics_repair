import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

interface TaxProfileAttributes {
  id: string
  locationKey: string // e.g., country-state-city or store location id
  country?: string | null
  state?: string | null
  city?: string | null
  taxRate: number // percentage, e.g., 18.0
  currencyCode?: string | null // ISO 4217
  createdAt?: Date
  updatedAt?: Date
}

interface TaxProfileCreationAttributes extends Optional<TaxProfileAttributes, 'id' | 'country' | 'state' | 'city' | 'currencyCode' | 'createdAt' | 'updatedAt'> {}

class TaxProfile extends Model<TaxProfileAttributes, TaxProfileCreationAttributes> implements TaxProfileAttributes {
  public id!: string
  public locationKey!: string
  public country?: string | null
  public state?: string | null
  public city?: string | null
  public taxRate!: number
  public currencyCode?: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

TaxProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    locationKey: { type: DataTypes.STRING, allowNull: false, unique: true },
    country: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    currencyCode: { type: DataTypes.STRING(3), allowNull: true },
  },
  {
    sequelize,
    modelName: 'TaxProfile',
    tableName: 'tax_profiles',
    timestamps: true,
    indexes: [
      { name: 'idx_tax_profile_location', unique: true, fields: ['locationKey'] },
    ],
  }
)

export default TaxProfile
