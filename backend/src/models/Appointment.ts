import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum AppointmentMode {
  REPAIR = 'repair',
  ESTIMATE = 'estimate',
}

interface AppointmentAttributes {
  id: string;
  customerId: string;
  locationId: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  mode: AppointmentMode; // determines auto-create type
  intake?: any | null; // JSON: { deviceType, brand, model, issueDescription }
  repairOrderId?: string | null;
  estimateId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AppointmentCreationAttributes
  extends Optional<
    AppointmentAttributes,
    'id' | 'status' | 'intake' | 'repairOrderId' | 'estimateId' | 'createdAt' | 'updatedAt'
  > {}

class Appointment
  extends Model<AppointmentAttributes, AppointmentCreationAttributes>
  implements AppointmentAttributes
{
  public id!: string;
  public customerId!: string;
  public locationId!: string;
  public start!: Date;
  public end!: Date;
  public status!: AppointmentStatus;
  public mode!: AppointmentMode;
  public intake?: any | null | undefined;
  public repairOrderId?: string | null | undefined;
  public estimateId?: string | null | undefined;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Appointment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customerId: { type: DataTypes.UUID, allowNull: false, references: { model: 'customers', key: 'id' } },
    locationId: { type: DataTypes.UUID, allowNull: false, references: { model: 'locations', key: 'id' } },
    start: { type: DataTypes.DATE, allowNull: false },
    end: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(AppointmentStatus)), allowNull: false, defaultValue: AppointmentStatus.SCHEDULED },
    mode: { type: DataTypes.ENUM(...Object.values(AppointmentMode)), allowNull: false, defaultValue: AppointmentMode.REPAIR },
    intake: { type: (DataTypes as any).JSONB || DataTypes.JSON, allowNull: true },
    repairOrderId: { type: DataTypes.UUID, allowNull: true, references: { model: 'repair_orders', key: 'id' } },
    estimateId: { type: DataTypes.UUID, allowNull: true, references: { model: 'estimates', key: 'id' } },
  },
  {
    sequelize,
    modelName: 'Appointment',
    tableName: 'appointments',
    timestamps: true,
    indexes: [
      { name: 'idx_appointments_location_start', fields: ['locationId', 'start'] },
      { name: 'idx_appointments_customer', fields: ['customerId'] },
    ],
  }
);

export default Appointment;
