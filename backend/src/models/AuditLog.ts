import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'refund'
  | 'assign'
  | 'cancel'
  | 'login'
  | 'logout';

export interface AuditLogAttributes {
  id: string;
  userId?: string | null;
  entityType: string; // e.g., 'RepairOrder', 'Payment'
  entityId: string;   // UUID of the entity
  action: AuditAction | string;
  details?: object | null; // JSON blob with diffs or context
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuditLogCreationAttributes
  extends Optional<AuditLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes {
  public id!: string;
  public userId?: string | null;
  public entityType!: string;
  public entityId!: string;
  public action!: AuditAction | string;
  public details?: object | null;
  public ip?: string | null;
  public userAgent?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true },
    entityType: { type: DataTypes.STRING, allowNull: false },
    entityId: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.JSONB as any, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      { name: 'idx_audit_entity_time', fields: ['entityType', 'entityId', 'createdAt'] },
      { name: 'idx_audit_user_time', fields: ['userId', 'createdAt'] },
      { name: 'idx_audit_action_time', fields: ['action', 'createdAt'] },
    ],
  }
);

export default AuditLog;
