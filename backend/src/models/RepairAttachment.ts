import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

interface RepairAttachmentAttrs {
  id: string
  repairOrderId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  uploadedByUserId: string
  createdAt?: Date
  updatedAt?: Date
}

type RepairAttachmentCreation = Optional<RepairAttachmentAttrs, 'id' | 'createdAt' | 'updatedAt'>

class RepairAttachment extends Model<RepairAttachmentAttrs, RepairAttachmentCreation> implements RepairAttachmentAttrs {
  public id!: string
  public repairOrderId!: string
  public filename!: string
  public originalName!: string
  public mimeType!: string
  public size!: number
  public uploadedByUserId!: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

RepairAttachment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    repairOrderId: { type: DataTypes.UUID, allowNull: false },
    filename: { type: DataTypes.STRING, allowNull: false },
    originalName: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false },
    uploadedByUserId: { type: DataTypes.UUID, allowNull: false },
  },
  { sequelize, modelName: 'RepairAttachment', tableName: 'repair_attachments', timestamps: true }
)

export default RepairAttachment
