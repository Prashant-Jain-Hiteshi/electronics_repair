import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

export type ScheduleKind = 'availability' | 'assignment'

interface TechnicianScheduleAttributes {
  id: string
  technicianId: string // userId of technician
  kind: ScheduleKind
  start: Date
  end: Date
  repairOrderId?: string | null
  capacityUnits?: number | null // effort units (e.g., hours)
  note?: string | null
  createdAt?: Date
  updatedAt?: Date
}

interface TechnicianScheduleCreationAttributes
  extends Optional<TechnicianScheduleAttributes, 'id' | 'repairOrderId' | 'capacityUnits' | 'note' | 'createdAt' | 'updatedAt'> {}

class TechnicianSchedule
  extends Model<TechnicianScheduleAttributes, TechnicianScheduleCreationAttributes>
  implements TechnicianScheduleAttributes {
  public id!: string
  public technicianId!: string
  public kind!: ScheduleKind
  public start!: Date
  public end!: Date
  public repairOrderId?: string | null
  public capacityUnits?: number | null
  public note?: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

TechnicianSchedule.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    technicianId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    kind: { type: DataTypes.ENUM('availability', 'assignment'), allowNull: false },
    start: { type: DataTypes.DATE, allowNull: false },
    end: { type: DataTypes.DATE, allowNull: false },
    repairOrderId: { type: DataTypes.UUID, allowNull: true, references: { model: 'repair_orders', key: 'id' } },
    capacityUnits: { type: DataTypes.INTEGER, allowNull: true },
    note: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'TechnicianSchedule', tableName: 'technician_schedules', timestamps: true }
)

export default TechnicianSchedule
