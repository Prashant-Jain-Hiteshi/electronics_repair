import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface InventoryAttributes {
  id: string;
  partName: string;
  partNumber: string;
  description?: string;
  category: string;
  brand?: string;
  supplier?: string;
  quantity: number;
  minStockLevel: number;
  unitCost: number;
  sellingPrice: number;
  location?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InventoryCreationAttributes
  extends Optional<InventoryAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Inventory
  extends Model<InventoryAttributes, InventoryCreationAttributes>
  implements InventoryAttributes
{
  public id!: string;
  public partName!: string;
  public partNumber!: string;
  public description?: string | undefined;
  public category!: string;
  public brand?: string | undefined;
  public supplier?: string | undefined;
  public quantity!: number;
  public minStockLevel!: number;
  public unitCost!: number;
  public sellingPrice!: number;
  public location?: string | undefined;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Inventory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    partName: { type: DataTypes.STRING, allowNull: false },
    partNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: false },
    brand: { type: DataTypes.STRING, allowNull: true },
    supplier: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    minStockLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    unitCost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    sellingPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    location: { type: DataTypes.STRING, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, modelName: 'Inventory', tableName: 'inventory', timestamps: true }
);

export default Inventory;
