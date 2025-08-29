import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type DiagnosticRunStatus = 'in_progress' | 'completed' | 'aborted';

export interface DiagnosticRunAttributes {
  id: string;
  repairOrderId: string;
  templateId: string | null; // could be null if ad-hoc
  steps: any[]; // snapshot of template steps/fault tree
  progress: any; // arbitrary structure: { currentIndex, answers: {...} }
  status: DiagnosticRunStatus;
  startedByUserId: string;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DiagnosticRunCreationAttributes
  extends Optional<DiagnosticRunAttributes, 'id' | 'templateId' | 'completedAt' | 'createdAt' | 'updatedAt'> {}

class DiagnosticRun extends Model<DiagnosticRunAttributes, DiagnosticRunCreationAttributes>
  implements DiagnosticRunAttributes {
  public id!: string;
  public repairOrderId!: string;
  public templateId!: string | null;
  public steps!: any[];
  public progress!: any;
  public status!: DiagnosticRunStatus;
  public startedByUserId!: string;
  public completedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DiagnosticRun.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    repairOrderId: { type: DataTypes.UUID, allowNull: false },
    templateId: { type: DataTypes.UUID, allowNull: true },
    steps: { type: DataTypes.JSONB as any, allowNull: false, defaultValue: [] },
    progress: { type: DataTypes.JSONB as any, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.ENUM('in_progress', 'completed', 'aborted'), allowNull: false, defaultValue: 'in_progress' },
    startedByUserId: { type: DataTypes.UUID, allowNull: false },
    completedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'DiagnosticRun',
    tableName: 'diagnostic_runs',
    timestamps: true,
    indexes: [
      { name: 'idx_diag_run_repair', fields: ['repairOrderId'] },
      { name: 'idx_diag_run_status', fields: ['status'] },
    ],
  }
);

export default DiagnosticRun;
