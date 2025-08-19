import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

export enum UserRole {
  ADMIN = 'admin',
  TECHNICIAN = 'technician',
  CUSTOMER = 'customer',
}

interface UserAttributes {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
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
    'id' | 'isActive' | 'isVerified' | 'otpCode' | 'otpExpiresAt' | 'password' | 'createdAt' | 'updatedAt'
  > {}

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public email!: string;
  public password?: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public role!: UserRole;
  public isActive!: boolean;
  public isVerified!: boolean;
  public otpCode?: string | null;
  public otpExpiresAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async comparePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
  }

  public toJSON() {
    const values = { ...this.get() } as any;
    delete values.password;
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
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
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) user.password = await bcrypt.hash(user.password, 12);
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password') && user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  }
);

export default User;
