import sequelize from '../config/database';
import User from './User';
import Customer from './Customer';
import RepairOrder from './RepairOrder';
import Inventory from './Inventory';
import Payment from './Payment';
import RepairPart from './RepairPart';
import RepairAttachment from './RepairAttachment';
import InventoryUsage from './InventoryUsage';
import Estimate from './Estimate';
import TechnicianProfile from './TechnicianProfile';
import TechnicianSchedule from './TechnicianSchedule';
import AnalyticsRollup from './AnalyticsRollup';
import TaxProfile from './TaxProfile';
import VendorPrice from './VendorPrice';
import Location from './Location';
import InventoryStock from './InventoryStock';
import StockTransfer from './StockTransfer';
import SlaPolicy from './SlaPolicy';
import EscalationLog from './EscalationLog';
import AuditLog from './AuditLog';
import DiagnosticTemplate from './DiagnosticTemplate';
import DiagnosticRun from './DiagnosticRun';
import WorkLog from './WorkLog';
import Appointment from './Appointment';
import ApprovalRequest from './ApprovalRequest';
import Warranty from './Warranty';
import RmaTicket from './RmaTicket';
import Feedback from './Feedback';
import CustomerDevice from './CustomerDevice';

// Associations
// User-Customer (1:1)
User.hasOne(Customer, { foreignKey: 'userId', as: 'customerProfile', onDelete: 'CASCADE' });
Customer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User (Technician) - RepairOrder (1:M)
User.hasMany(RepairOrder, { foreignKey: 'technicianId', as: 'assignedRepairs' });
RepairOrder.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

// User - Location (M:1)
Location.hasMany(User, { foreignKey: 'locationId', as: 'users' });
User.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });

// User (Technician) - TechnicianProfile (1:1)
User.hasOne(TechnicianProfile, { foreignKey: 'userId', as: 'techProfile', onDelete: 'CASCADE' });
TechnicianProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User (Technician) - TechnicianSchedule (1:M)
User.hasMany(TechnicianSchedule, { foreignKey: 'technicianId', as: 'schedules', onDelete: 'CASCADE' });
TechnicianSchedule.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

// RepairOrder - TechnicianSchedule (1:M optional)
RepairOrder.hasMany(TechnicianSchedule, { foreignKey: 'repairOrderId', as: 'techAssignments' });
TechnicianSchedule.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// Customer - RepairOrder (1:M)
Customer.hasMany(RepairOrder, { foreignKey: 'customerId', as: 'repairOrders' });
RepairOrder.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// RepairOrder - Location (M:1)
Location.hasMany(RepairOrder, { foreignKey: 'locationId', as: 'repairs' });
RepairOrder.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });

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

// Inventory - InventoryStock - Location
Inventory.hasMany(InventoryStock, { foreignKey: 'inventoryId', as: 'stocks' });
InventoryStock.belongsTo(Inventory, { foreignKey: 'inventoryId', as: 'inventory' });
Location.hasMany(InventoryStock, { foreignKey: 'locationId', as: 'stocks' });
InventoryStock.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });

// StockTransfer associations
StockTransfer.belongsTo(Location, { foreignKey: 'fromLocationId', as: 'fromLocation' });
StockTransfer.belongsTo(Location, { foreignKey: 'toLocationId', as: 'toLocation' });
StockTransfer.belongsTo(Inventory, { foreignKey: 'inventoryId', as: 'inventory' });
Location.hasMany(StockTransfer, { foreignKey: 'fromLocationId', as: 'outgoingTransfers' });
Location.hasMany(StockTransfer, { foreignKey: 'toLocationId', as: 'incomingTransfers' });

// RepairOrder - Payment (1:M)
RepairOrder.hasMany(Payment, { foreignKey: 'repairOrderId', as: 'payments' });
Payment.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// RepairOrder - RepairAttachment (1:M)
RepairOrder.hasMany(RepairAttachment, { foreignKey: 'repairOrderId', as: 'attachments' });
RepairAttachment.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// RepairOrder - EscalationLog (1:M)
RepairOrder.hasMany(EscalationLog, { foreignKey: 'repairOrderId', as: 'escalations' });
EscalationLog.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// RepairOrder - DiagnosticRun (1:M)
RepairOrder.hasMany(DiagnosticRun, { foreignKey: 'repairOrderId', as: 'diagnosticRuns' });
DiagnosticRun.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// WorkLog associations
// RepairOrder - WorkLog (1:M)
RepairOrder.hasMany(WorkLog, { foreignKey: 'repairOrderId', as: 'workLogs' });
WorkLog.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });
// User (Technician) - WorkLog (1:M)
User.hasMany(WorkLog, { foreignKey: 'technicianId', as: 'workLogs' });
WorkLog.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

// Customer - Estimate (1:M)
Customer.hasMany(Estimate, { foreignKey: 'customerId', as: 'estimates' });
Estimate.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// RepairOrder - Estimate (1:1) optional
RepairOrder.hasOne(Estimate, { foreignKey: 'repairOrderId', as: 'estimate' });
Estimate.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });

// Appointments
// Customer - Appointment (1:M)
Customer.hasMany(Appointment, { foreignKey: 'customerId', as: 'appointments' });
Appointment.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
// Location - Appointment (1:M)
Location.hasMany(Appointment, { foreignKey: 'locationId', as: 'appointments' });
Appointment.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });
// Optional linkages
Appointment.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });
Appointment.belongsTo(Estimate, { foreignKey: 'estimateId', as: 'estimate' });

// Approval Requests
// RepairOrder - ApprovalRequest (1:M)
RepairOrder.hasMany(ApprovalRequest, { foreignKey: 'repairOrderId', as: 'approvals' });
ApprovalRequest.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });
// Customer - ApprovalRequest (1:M)
Customer.hasMany(ApprovalRequest, { foreignKey: 'customerId', as: 'approvals' });
ApprovalRequest.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Warranty associations
// RepairOrder - Warranty (1:1)
RepairOrder.hasOne(Warranty, { foreignKey: 'repairOrderId', as: 'warranty' });
Warranty.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });
// Customer - Warranty (1:M)
Customer.hasMany(Warranty, { foreignKey: 'customerId', as: 'warranties' });
Warranty.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// RMA associations
// RepairOrder - RmaTicket (1:M)
RepairOrder.hasMany(RmaTicket, { foreignKey: 'repairOrderId', as: 'rmas' });
RmaTicket.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });
// Customer - RmaTicket (1:M)
Customer.hasMany(RmaTicket, { foreignKey: 'customerId', as: 'rmas' });
RmaTicket.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
// Warranty - RmaTicket (1:M optional)
Warranty.hasMany(RmaTicket, { foreignKey: 'warrantyId', as: 'rmas' });
RmaTicket.belongsTo(Warranty, { foreignKey: 'warrantyId', as: 'warranty' });

// Feedback associations
// RepairOrder - Feedback (1:M) allow multiple feedback updates if desired (or enforce one at controller)
RepairOrder.hasMany(Feedback, { foreignKey: 'repairOrderId', as: 'feedback' });
Feedback.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'repairOrder' });
// Customer - Feedback (1:M)
Customer.hasMany(Feedback, { foreignKey: 'customerId', as: 'feedback' });
Feedback.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
// User (Technician) - Feedback (1:M optional link)
User.hasMany(Feedback, { foreignKey: 'technicianId', as: 'receivedFeedback' });
Feedback.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

// CustomerDevice associations
Customer.hasMany(CustomerDevice, { foreignKey: 'customerId', as: 'devices' });
CustomerDevice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
CustomerDevice.hasMany(RepairOrder, { foreignKey: 'customerDeviceId', as: 'repairs' });
RepairOrder.belongsTo(CustomerDevice, { foreignKey: 'customerDeviceId', as: 'device' });

// Expose direct associations on through model for convenient includes
RepairPart.belongsTo(Inventory, { foreignKey: 'inventoryId', as: 'Inventory' });
RepairPart.belongsTo(RepairOrder, { foreignKey: 'repairOrderId', as: 'RepairOrder' });

export { sequelize, User, Customer, RepairOrder, Inventory, Payment, RepairPart, RepairAttachment, InventoryUsage, Estimate, TechnicianProfile, TechnicianSchedule, AnalyticsRollup, TaxProfile, VendorPrice, Location, InventoryStock, StockTransfer, SlaPolicy, EscalationLog, AuditLog, DiagnosticTemplate, DiagnosticRun, WorkLog, Appointment, ApprovalRequest, Warranty, RmaTicket, Feedback, CustomerDevice };
