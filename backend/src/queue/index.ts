import { getRedis } from '../config/redis';
import { isRealRedis } from '../config/redis';
import type { Redis } from 'ioredis';

type BullModule = typeof import('bullmq');
let BullMQ: BullModule | null = null;
try { BullMQ = require('bullmq') as BullModule; } catch { BullMQ = null; }

const connection: Redis = (getRedis() as Redis).duplicate();

export interface EnqueueOptions {
  delay?: number;
  priority?: number;
  attempts?: number;
  jobId?: string;
  backoff?: number | { type: string; delay: number };
}
type EnqueueReturn = Promise<{ id: string } | { id?: string } | void>;

export interface NotificationJobData { userId: string; event: string; data?: Record<string, unknown>; channels?: ('in_app' | 'email' | 'sms')[] }
export interface EmailJobData { to: string; subject: string; body?: string }

interface QueueLike<TData> {
  add(name: string, data: TData, opts?: EnqueueOptions): Promise<{ id: string } | { id?: string }>
}

let queues: { notifications: QueueLike<NotificationJobData>; emails: QueueLike<EmailJobData> };
let queueEvents: { notifications?: object; emails?: object };
let startWorkersFn: () => Promise<void>;
let enqueueNotificationFn: (data: NotificationJobData, opts?: EnqueueOptions) => EnqueueReturn;
let enqueueEmailFn: (data: EmailJobData, opts?: EnqueueOptions) => EnqueueReturn;

if (BullMQ && isRealRedis()) {
  const { Queue, Worker, QueueEvents } = BullMQ;
  queues = {
    notifications: new Queue('notifications', { connection }) as unknown as QueueLike<NotificationJobData>,
    emails: new Queue('emails', { connection }) as unknown as QueueLike<EmailJobData>,
  };
  queueEvents = {
    notifications: new QueueEvents('notifications', { connection }) as unknown as object,
    emails: new QueueEvents('emails', { connection }) as unknown as object,
  };
  startWorkersFn = async () => {
    new Worker(
      'notifications',
      async (job: { data: NotificationJobData }) => {
        const { notify } = await import('../services/notifications.service');
        const { userId, event, data, channels } = job.data;
        await notify({ userId, event, data, channels });
      },
      { connection }
    );
    new Worker(
      'emails',
      async (job: { data: EmailJobData }) => {
        const { to, subject } = job.data;
        try { console.log(`[email] to=${to} subject=${subject}`); } catch {}
      },
      { connection }
    );
    try { console.log('[queue] workers started'); } catch {}
  };
  enqueueNotificationFn = async (data: NotificationJobData, opts?: EnqueueOptions) => queues.notifications.add('notify', data, opts);
  enqueueEmailFn = async (data: EmailJobData, opts?: EnqueueOptions) => queues.emails.add('email', data, opts);
} else {
  const noop: QueueLike<unknown> = {
    add: async (_name: string, _data: unknown, _opts?: EnqueueOptions) => {
      try { console.warn('[queue] queue disabled (bullmq missing or real redis not configured); enqueue is a no-op'); } catch {}
      return { id: 'noop' };
    },
  };
  queues = { notifications: noop as QueueLike<NotificationJobData>, emails: noop as QueueLike<EmailJobData> };
  queueEvents = {};
  startWorkersFn = async () => { try { console.warn('[queue] queue disabled (bullmq missing or real redis not configured); workers not started'); } catch {} };
  enqueueNotificationFn = async (data: NotificationJobData, opts?: EnqueueOptions) => queues.notifications.add('notify', data, opts);
  enqueueEmailFn = async (data: EmailJobData, opts?: EnqueueOptions) => queues.emails.add('email', data, opts);
}

export { queues, queueEvents, startWorkersFn as startWorkers, enqueueNotificationFn as enqueueNotification, enqueueEmailFn as enqueueEmail };
