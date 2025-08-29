import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'

export interface FeedbackAttrs {
  id: string
  repairOrderId: string
  customerId: string
  technicianId?: string | null
  rating: number // 1-5 stars
  comments?: string | null
  npsScore?: number | null // 0-10
  notifiedLowRating: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type FeedbackCreation = Optional<FeedbackAttrs, 'id' | 'technicianId' | 'comments' | 'npsScore' | 'notifiedLowRating' | 'createdAt' | 'updatedAt'>

class Feedback extends Model<FeedbackAttrs, FeedbackCreation> implements FeedbackAttrs {
  public id!: string
  public repairOrderId!: string
  public customerId!: string
  public technicianId!: string | null
  public rating!: number
  public comments!: string | null
  public npsScore!: number | null
  public notifiedLowRating!: boolean
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Feedback.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    repairOrderId: { type: DataTypes.UUID, allowNull: false },
    customerId: { type: DataTypes.UUID, allowNull: false },
    technicianId: { type: DataTypes.UUID, allowNull: true },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    comments: { type: DataTypes.TEXT, allowNull: true },
    npsScore: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0, max: 10 } },
    notifiedLowRating: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: 'feedback', modelName: 'Feedback' }
)

export default Feedback
