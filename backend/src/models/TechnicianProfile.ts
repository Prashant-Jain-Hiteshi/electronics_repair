import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

interface TechnicianProfileAttributes {
  id: string
  userId: string // technician user id
  skills: string[]
  dailyCapacity: number // hours or units per day
  timezone?: string | null
  color?: string | null
  createdAt?: Date
  updatedAt?: Date
}

interface TechnicianProfileCreationAttributes extends Optional<TechnicianProfileAttributes, 'id' | 'skills' | 'dailyCapacity' | 'timezone' | 'color' | 'createdAt' | 'updatedAt'> {}

class TechnicianProfile extends Model<TechnicianProfileAttributes, TechnicianProfileCreationAttributes> implements TechnicianProfileAttributes {
  public id!: string
  public userId!: string
  public skills!: string[]
  public dailyCapacity!: number
  public timezone?: string | null
  public color?: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

TechnicianProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    skills: { type: DataTypes.JSONB as any, allowNull: false, defaultValue: [] },
    dailyCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8 },
    timezone: { type: DataTypes.STRING, allowNull: true },
    color: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'TechnicianProfile', tableName: 'technician_profiles', timestamps: true }
)

export default TechnicianProfile
