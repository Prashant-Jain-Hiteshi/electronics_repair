import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface RepairPartAttributes {
  id: string;
  repairOrderId: string;
  inventoryId: string;
  quantity: number;
  unitPrice?: number; // snapshot price at usage time (optional)
  createdAt?: Date;
  updatedAt?: Date;
}

interface RepairPartCreationAttributes
  extends Optional<RepairPartAttributes, 'id' | 'unitPrice' | 'createdAt' | 'updatedAt'> {}

class RepairPart
  extends Model<RepairPartAttributes, RepairPartCreationAttributes>
  implements RepairPartAttributes
{
  public id!: string;
  public repairOrderId!: string;
  public inventoryId!: string;
  public quantity!: number;
  public unitPrice?: number | undefined;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RepairPart.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    repairOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'repair_orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    inventoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'inventory', key: 'id' },
      onDelete: 'RESTRICT',
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  },
  { sequelize, modelName: 'RepairPart', tableName: 'repair_parts', timestamps: true }
);

export default RepairPart;
