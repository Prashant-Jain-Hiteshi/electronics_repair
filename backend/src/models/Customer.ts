import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CustomerAttributes {
  id: string;
  userId: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  devicePreferences?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CustomerCreationAttributes
  extends Optional<CustomerAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Customer
  extends Model<CustomerAttributes, CustomerCreationAttributes>
  implements CustomerAttributes
{
  public id!: string;
  public userId!: string;
  public address?: string;
  public city?: string;
  public state?: string;
  public zipCode?: string;
  public devicePreferences?: string;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Customer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    address: { type: DataTypes.TEXT, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    zipCode: { type: DataTypes.STRING, allowNull: true },
    devicePreferences: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'Customer', tableName: 'customers', timestamps: true }
);

export default Customer;
