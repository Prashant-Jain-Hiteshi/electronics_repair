import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

export type WorkLogStatus = 'running' | 'completed' | 'aborted'

interface WorkLogAttributes {
  id: string
  repairOrderId: string
  technicianId: string
  taskType: string
  benchId?: string | null
  startTime: Date
  endTime?: Date | null
  notes?: string | null
  status: WorkLogStatus
  createdAt?: Date
  updatedAt?: Date
}

type WorkLogCreation = Optional<WorkLogAttributes, 'id' | 'benchId' | 'endTime' | 'notes' | 'status'>

class WorkLog extends Model<WorkLogAttributes, WorkLogCreation> implements WorkLogAttributes {
  public id!: string
  public repairOrderId!: string
  public technicianId!: string
  public taskType!: string
  public benchId!: string | null
  public startTime!: Date
  public endTime!: Date | null
  public notes!: string | null
  public status!: WorkLogStatus
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

WorkLog.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  repairOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  technicianId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  taskType: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  benchId: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('running', 'completed', 'aborted'),
    allowNull: false,
    defaultValue: 'running',
  },
}, {
  sequelize,
  tableName: 'WorkLogs',
  indexes: [
    { fields: ['repairOrderId'] },
    { fields: ['technicianId'] },
    { fields: ['benchId'] },
    { fields: ['status'] },
    { fields: ['startTime'] },
  ],
})

export default WorkLog
