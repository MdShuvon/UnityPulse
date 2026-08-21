import Redis from 'ioredis';
import EventEmitter from 'events';
export const notificationEmitter = new EventEmitter();

const config = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

// Normal commands (get, set, publish, session)
export const redis = new Redis(config);

// Subscribe only — SSE এর জন্য আলাদা connection
export const redisSub = new Redis({
  ...config,
  enableReadyCheck: false,  // info command চালাবে না
});

redis.on('connect',    () => console.log('✅ Redis connected'));
redis.on('error', (e) => console.error('Redis error:', e));

redisSub.on('error', (e) => {
  // Subscribe mode error ignore করো - harmless
  if (e.message.includes('only (P|S)SUBSCRIBE')) return;
  console.error('Redis Sub error:', e);
});

// SSE এর জন্য EventEmitter pattern
export const donationEmitter = new EventEmitter();
export const taskEmitter = new EventEmitter();

// Donation live channel subscribe
export async function setupRedisListeners() {
  await redisSub.subscribe('donation:live', 'task:feed');
  await redisSub.psubscribe('notify:*'); // ← ADD: সব user এর notification channel

  redisSub.on('message', (channel, message) => {
    const data = JSON.parse(message);
    if (channel === 'donation:live') donationEmitter.emit('new', data);
    if (channel === 'task:feed')     taskEmitter.emit('new', data);
  });

  // Pattern message — notify:{userId} channel এ আসলে
  redisSub.on('pmessage', (_pattern, channel, message) => {
    const userId = channel.replace('notify:', '');
    notificationEmitter.emit(`user:${userId}`, JSON.parse(message));
  });

  console.log('Redis listeners ready');
}