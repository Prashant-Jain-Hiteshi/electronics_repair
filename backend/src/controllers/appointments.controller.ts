import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Appointment, Customer, Location, RepairOrder, Estimate } from '../models';
import { AppointmentStatus, AppointmentMode } from '../models/Appointment';
import { RepairStatus, Priority } from '../models/RepairOrder';
import { EstimateStatus } from '../models/Estimate';

// Simple business hours and sloting config
const SLOT_MINUTES = 60; // 1 hour slots
const START_HOUR = 9; // 9 AM
const END_HOUR = 17; // 5 PM
const MAX_APPTS_PER_SLOT_PER_LOCATION = 3; // capacity per slot per location

function toStartOfHour(d: Date) {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60 * 1000);
}

function isSunday(d: Date) {
  return d.getDay() === 0;
}

export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { locationId, from, to } = req.query as any;
    if (!locationId) return res.status(400).json({ message: 'locationId is required' });

    const location = await Location.findByPk(locationId);
    if (!location) return res.status(404).json({ message: 'Location not found' });

    const rangeStart = from ? new Date(from) : new Date();
    const rangeEnd = to ? new Date(to) : addMinutes(new Date(), 14 * 24 * 60); // default 14 days
    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      return res.status(400).json({ message: 'Invalid from/to date' });
    }

    const slots: Array<{ start: string; end: string; capacity: number; booked: number; available: number }> = [];

    // iterate each day
    let cursor = new Date(rangeStart);
    cursor.setHours(START_HOUR, 0, 0, 0);
    while (cursor <= rangeEnd) {
      if (!isSunday(cursor)) {
        // within working hours
        let slotStart = new Date(cursor);
        while (slotStart.getHours() < END_HOUR) {
          const slotEnd = addMinutes(slotStart, SLOT_MINUTES);

          // count existing scheduled appointments overlapping this slot
          const booked = await Appointment.count({
            where: {
              locationId,
              status: AppointmentStatus.SCHEDULED,
              [Op.and]: [
                { start: { [Op.lt]: slotEnd } },
                { end: { [Op.gt]: slotStart } },
              ],
            },
          });
          const available = Math.max(0, MAX_APPTS_PER_SLOT_PER_LOCATION - booked);
          slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString(), capacity: MAX_APPTS_PER_SLOT_PER_LOCATION, booked, available });

          slotStart = slotEnd;
        }
      }
      // move to next day start
      const nextDay = new Date(cursor);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(START_HOUR, 0, 0, 0);
      cursor = nextDay;
    }

    res.json({ locationId, slots });
  } catch (err: any) {
    console.error('getAvailableSlots error', err);
    res.status(500).json({ message: 'Failed to fetch slots' });
  }
};

export const listMyAppointments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const customer = await Customer.findOne({ where: { userId } });
    if (!customer) return res.status(404).json({ message: 'Customer profile not found' });

    const appts = await Appointment.findAll({
      where: { customerId: customer.id },
      include: [
        { model: Location, as: 'location' },
        { model: RepairOrder, as: 'repairOrder' },
        { model: Estimate, as: 'estimate' },
      ],
      order: [['start', 'ASC']],
    });
    res.json(appts);
  } catch (err) {
    console.error('listMyAppointments error', err);
    res.status(500).json({ message: 'Failed to load appointments' });
  }
};

export const getAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findByPk(id, {
      include: [
        { model: Location, as: 'location' },
        { model: RepairOrder, as: 'repairOrder' },
        { model: Estimate, as: 'estimate' },
      ],
    });
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appt);
  } catch (err) {
    console.error('getAppointment error', err);
    res.status(500).json({ message: 'Failed to load appointment' });
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const customer = await Customer.findOne({ where: { userId } });
    if (!customer) return res.status(404).json({ message: 'Customer profile not found' });

    const { locationId, start, end, mode, intake } = req.body as {
      locationId: string;
      start: string;
      end?: string;
      mode?: AppointmentMode;
      intake?: any;
    };
    if (!locationId || !start) return res.status(400).json({ message: 'locationId and start are required' });

    const startDt = new Date(start);
    const endDt = end ? new Date(end) : addMinutes(startDt, SLOT_MINUTES);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) return res.status(400).json({ message: 'Invalid start/end' });

    // capacity check
    const overlapping = await Appointment.count({
      where: {
        locationId,
        status: AppointmentStatus.SCHEDULED,
        [Op.and]: [
          { start: { [Op.lt]: endDt } },
          { end: { [Op.gt]: startDt } },
        ],
      },
    });
    if (overlapping >= MAX_APPTS_PER_SLOT_PER_LOCATION) {
      return res.status(409).json({ message: 'Selected slot is fully booked' });
    }

    const appt = await Appointment.create({
      customerId: customer.id,
      locationId,
      start: startDt,
      end: endDt,
      status: AppointmentStatus.SCHEDULED,
      mode: mode || AppointmentMode.REPAIR,
      intake: intake || null,
    });

    // Auto-create related entity based on mode
    if (appt.mode === AppointmentMode.REPAIR) {
      const ro = await RepairOrder.create({
        customerId: customer.id,
        locationId,
        deviceType: intake?.deviceType || 'unknown',
        brand: intake?.brand || intake?.deviceBrand || 'unknown',
        model: intake?.model || intake?.deviceModel || 'unknown',
        issueDescription: intake?.issueDescription || 'Appointment booking',
        status: RepairStatus.PENDING,
        priority: Priority.MEDIUM,
      });
      appt.repairOrderId = ro.id;
      await appt.save();
    } else if (appt.mode === AppointmentMode.ESTIMATE) {
      const est = await Estimate.create({
        customerId: customer.id,
        deviceType: intake?.deviceType || 'unknown',
        brand: intake?.brand || intake?.deviceBrand || 'unknown',
        model: intake?.model || intake?.deviceModel || 'unknown',
        issueDescription: intake?.issueDescription || 'Estimate requested via appointment',
        status: EstimateStatus.SENT,
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
      });
      appt.estimateId = est.id;
      await appt.save();
    }

    const created = await Appointment.findByPk(appt.id, {
      include: [
        { model: Location, as: 'location' },
        { model: RepairOrder, as: 'repairOrder' },
        { model: Estimate, as: 'estimate' },
      ],
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('createAppointment error', err);
    res.status(500).json({ message: 'Failed to create appointment' });
  }
};

export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findByPk(id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.status !== AppointmentStatus.SCHEDULED) return res.status(400).json({ message: 'Only scheduled appointments can be cancelled' });

    appt.status = AppointmentStatus.CANCELLED;
    await appt.save();

    res.json({ message: 'Appointment cancelled', appointment: appt });
  } catch (err) {
    console.error('cancelAppointment error', err);
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findByPk(id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const { start, end } = req.body as { start?: string; end?: string };
    if (!start && !end) return res.status(400).json({ message: 'Nothing to update' });

    const newStart = start ? new Date(start) : new Date(appt.start);
    const newEnd = end ? new Date(end) : new Date(appt.end);

    // capacity check for new time
    const overlapping = await Appointment.count({
      where: {
        id: { [Op.ne]: appt.id },
        locationId: appt.locationId,
        status: AppointmentStatus.SCHEDULED,
        [Op.and]: [
          { start: { [Op.lt]: newEnd } },
          { end: { [Op.gt]: newStart } },
        ],
      },
    });
    if (overlapping >= MAX_APPTS_PER_SLOT_PER_LOCATION) {
      return res.status(409).json({ message: 'Selected slot is fully booked' });
    }

    appt.start = newStart;
    appt.end = newEnd;
    await appt.save();

    const updated = await Appointment.findByPk(appt.id, {
      include: [
        { model: Location, as: 'location' },
        { model: RepairOrder, as: 'repairOrder' },
        { model: Estimate, as: 'estimate' },
      ],
    });

    res.json(updated);
  } catch (err) {
    console.error('updateAppointment error', err);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
};
