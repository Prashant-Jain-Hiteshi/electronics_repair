import { Request, Response } from 'express';
import { Op } from 'sequelize';
import DiagnosticTemplate from '../models/DiagnosticTemplate';
import DiagnosticRun from '../models/DiagnosticRun';
import RepairOrder from '../models/RepairOrder';

// ===== Templates =====
export async function createTemplate(req: Request, res: Response) {
  try {
    const { name, deviceType, steps, isActive = true } = req.body || {};
    if (!name || !deviceType || !Array.isArray(steps)) {
      return res.status(400).json({ message: 'name, deviceType and steps[] are required' });
    }
    const tpl = await DiagnosticTemplate.create({ name, deviceType, steps, isActive });
    return res.status(201).json({ template: tpl });
  } catch (err) {
    console.error('Create template error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listTemplates(req: Request, res: Response) {
  try {
    const { deviceType, includeInactive } = (req.query || {}) as Record<string, string | undefined>;
    const where: any = {};
    if (deviceType) where.deviceType = deviceType;
    if (!includeInactive) where.isActive = true;
    const templates = await DiagnosticTemplate.findAll({ where });
    return res.status(200).json({ templates });
  } catch (err) {
    console.error('List templates error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const tpl = await DiagnosticTemplate.findByPk(id);
    if (!tpl) return res.status(404).json({ message: 'Template not found' });
    const { name, deviceType, steps, isActive } = req.body || {};
    await tpl.update({
      ...(name !== undefined ? { name } : {}),
      ...(deviceType !== undefined ? { deviceType } : {}),
      ...(steps !== undefined ? { steps } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    });
    return res.status(200).json({ template: tpl });
  } catch (err) {
    console.error('Update template error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deactivateTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const tpl = await DiagnosticTemplate.findByPk(id);
    if (!tpl) return res.status(404).json({ message: 'Template not found' });
    await tpl.update({ isActive: false });
    return res.status(200).json({ template: tpl });
  } catch (err) {
    console.error('Deactivate template error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// ===== Runs =====
export async function startRun(req: Request, res: Response) {
  try {
    const { repairId } = req.params;
    const { templateId } = req.body || {};
    const repair = await RepairOrder.findByPk(repairId);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });

    let tpl = null as any;
    if (templateId) {
      tpl = await DiagnosticTemplate.findByPk(templateId);
      if (!tpl || !(tpl as any).isActive) return res.status(400).json({ message: 'Invalid templateId' });
    } else {
      // auto-pick by deviceType
      tpl = await DiagnosticTemplate.findOne({ where: { deviceType: (repair as any).deviceType, isActive: true } as any, order: [['updatedAt', 'DESC']] });
      if (!tpl) return res.status(400).json({ message: 'No active template for device type' });
    }

    const reqAny = req as any;
    const run = await DiagnosticRun.create({
      repairOrderId: repairId,
      templateId: (tpl as any).id,
      steps: (tpl as any).steps,
      progress: { currentIndex: 0, answers: {} },
      status: 'in_progress',
      startedByUserId: reqAny?.user?.id || null,
    } as any);

    return res.status(201).json({ run });
  } catch (err) {
    console.error('Start diagnostic run error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listRunsForRepair(req: Request, res: Response) {
  try {
    const { repairId } = req.params;
    const runs = await DiagnosticRun.findAll({ where: { repairOrderId: repairId } as any, order: [['createdAt', 'DESC']] });
    return res.status(200).json({ runs });
  } catch (err) {
    console.error('List runs error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function latestRunForRepair(req: Request, res: Response) {
  try {
    const { repairId } = req.params;
    const run = await DiagnosticRun.findOne({ where: { repairOrderId: repairId } as any, order: [['createdAt', 'DESC']] });
    if (!run) return res.status(404).json({ message: 'No runs found' });
    return res.status(200).json({ run });
  } catch (err) {
    console.error('Latest run error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function submitStep(req: Request, res: Response) {
  try {
    const { runId } = req.params;
    const { answer, nextIndex } = req.body || {};
    const run = await DiagnosticRun.findByPk(runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if ((run as any).status !== 'in_progress') return res.status(400).json({ message: 'Run not in progress' });

    const progress = { ...((run as any).progress || { currentIndex: 0, answers: {} }) };
    const idx = progress.currentIndex ?? 0;
    progress.answers = progress.answers || {};
    progress.answers[idx] = answer;
    if (typeof nextIndex === 'number') progress.currentIndex = nextIndex;
    else progress.currentIndex = idx + 1;

    await run.update({ progress });
    return res.status(200).json({ run });
  } catch (err) {
    console.error('Submit step error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function completeRun(req: Request, res: Response) {
  try {
    const { runId } = req.params;
    const run = await DiagnosticRun.findByPk(runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if ((run as any).status !== 'in_progress') return res.status(400).json({ message: 'Run not in progress' });

    await run.update({ status: 'completed', completedAt: new Date(), progress: (run as any).progress });
    return res.status(200).json({ run });
  } catch (err) {
    console.error('Complete run error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function abortRun(req: Request, res: Response) {
  try {
    const { runId } = req.params;
    const run = await DiagnosticRun.findByPk(runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if ((run as any).status !== 'in_progress') return res.status(400).json({ message: 'Run not in progress' });

    await run.update({ status: 'aborted' });
    return res.status(200).json({ run });
  } catch (err) {
    console.error('Abort run error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
