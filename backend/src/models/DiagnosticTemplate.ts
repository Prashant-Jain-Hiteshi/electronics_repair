import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface DiagnosticTemplateAttributes {
  id: string;
  name: string; // e.g., "Smartphone General"
  deviceType: string; // smartphone, laptop, tablet
  steps: any[]; // ordered steps/checklist/fault tree nodes
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DiagnosticTemplateCreationAttributes
  extends Optional<DiagnosticTemplateAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class DiagnosticTemplate extends Model<DiagnosticTemplateAttributes, DiagnosticTemplateCreationAttributes>
  implements DiagnosticTemplateAttributes {
  public id!: string;
  public name!: string;
  public deviceType!: string;
  public steps!: any[];
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DiagnosticTemplate.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    deviceType: { type: DataTypes.STRING, allowNull: false },
    steps: { type: DataTypes.JSONB as any, allowNull: false, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName: 'DiagnosticTemplate',
    tableName: 'diagnostic_templates',
    timestamps: true,
    indexes: [
      { name: 'idx_diag_template_device_active', fields: ['deviceType', 'isActive'] },
    ],
  }
);

export default DiagnosticTemplate;
