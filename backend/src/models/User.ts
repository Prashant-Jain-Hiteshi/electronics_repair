import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum UserRole {
  ADMIN = 'admin',
  TECHNICIAN = 'technician',
  CUSTOMER = 'customer',
}

interface UserAttributes {
  id: string;
  mobile: string; // Indian mobile number used for login
  firstName: string;
  lastName: string;
  address?: string | null;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  otpCode?: string | null;
  otpExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    'id' | 'isActive' | 'isVerified' | 'otpCode' | 'otpExpiresAt' | 'address' | 'createdAt' | 'updatedAt'
  > {}

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public mobile!: string;
  public firstName!: string;
  public lastName!: string;
  public address?: string | null;
  public role!: UserRole;
  public isActive!: boolean;
  public isVerified!: boolean;
  public otpCode?: string | null;
  public otpExpiresAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public toJSON() {
    const values = { ...this.get() } as any;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        // Exactly 10 digits
        is: /^\d{10}$/,
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.CUSTOMER,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    otpCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {},
  }
);

export default User;
