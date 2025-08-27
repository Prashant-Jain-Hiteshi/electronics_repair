import sequelize from '../config/database';
import User from './User';
import Customer from './Customer';
import RepairOrder from './RepairOrder';
import Inventory from './Inventory';
import Payment from './Payment';
import RepairPart from './RepairPart';
import RepairAttachment from './RepairAttachment';
import InventoryUsage from './InventoryUsage';

// Associations
// User-Customer (1:1)
User.hasOne(Customer, { foreignKey: 'userId', as: 'customerProfile', onDelete: 'CASCADE' });
Customer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User (Technician) - RepairOrder (1:M)
User.hasMany(RepairOrder, { foreignKey: 'technicianId', as: 'assignedRepairs' });
RepairOrder.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

// Customer - RepairOrder (1:M)
Customer.hasMany(RepairOrder, { foreignKey: 'customerId', as: 'repairOrders' });
RepairOrder.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// RepairOrder - Inventory through RepairPart (M:N)
RepairOrder.belongsToMany(Inventory, {
  through: RepairPart,
  foreignKey: 'repairOrderId',
  otherKey: 'inventoryId',
  as: 'parts',
});
Inventory.belongsToMany(RepairOrder, {
  through: RepairPart,
  foreignKey: 'inventoryId',
  otherKey: 'repairOrderId',
  as: 'usedInRepairs',
});

// Inventory - InventoryUsage (1:M)
Inventory.hasMany(InventoryUsage, { foreignKey: 'inventoryId', as: 'usage' });
InventoryUsage.belongsTo(Inventory, { foreignKey: 'inventoryId', as: 'inventory' });

// RepairOrder - InventoryUsage (1:M, optional relation)
RepairOrder.hasMany(InventoryUsage, { foreignKey: 'repairOrderId', as: 'partUsage' });
InventoryUsage.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// RepairOrder - Payment (1:M)
RepairOrder.hasMany(Payment, { foreignKey: 'repairOrderId', as: 'payments' });
Payment.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// RepairOrder - RepairAttachment (1:M)
RepairOrder.hasMany(RepairAttachment, { foreignKey: 'repairOrderId', as: 'attachments' });
RepairAttachment.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// Expose direct associations on through model for convenient includes
RepairPart.belongsTo(Inventory, { foreignKey: 'inventoryId', as: 'Inventory' });
RepairPart.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'RepairOrder' });

export { sequelize, User, Customer, RepairOrder, Inventory, Payment, RepairPart, RepairAttachment, InventoryUsage };
