import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

export enum RmaStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

interface RmaAttrs {
  id: string
  repairOrderId: string
  customerId: string
  warrantyId?: string | null
  reason?: string | null
  description?: string | null
  status: RmaStatus
  attachments?: any | null // array of { filename, originalName, mimeType, size }
  createdAt?: Date
  updatedAt?: Date
}

type RmaCreation = Optional<RmaAttrs, 'id' | 'warrantyId' | 'reason' | 'description' | 'status' | 'attachments' | 'createdAt' | 'updatedAt'>

class RmaTicket extends Model<RmaAttrs, RmaCreation> implements RmaAttrs {
  public id!: string
  public repairOrderId!: string
  public customerId!: string
  public warrantyId!: string | null
  public reason!: string | null
  public description!: string | null
  public status!: RmaStatus
  public attachments!: any | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

RmaTicket.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    repairOrderId: { type: DataTypes.UUID, allowNull: false },
    customerId: { type: DataTypes.UUID, allowNull: false },
    warrantyId: { type: DataTypes.UUID, allowNull: true },
    reason: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(RmaStatus)), allowNull: false, defaultValue: RmaStatus.REQUESTED },
    attachments: { type: (sequelize as any).Sequelize?.JSONB || (sequelize as any).Sequelize?.JSON || DataTypes.JSON, allowNull: true },
  },
  { sequelize, tableName: 'rma_tickets', modelName: 'RmaTicket' }
)

export default RmaTicket
