import { createHmac } from 'crypto';
import { Store, Options } from 'express-rate-limit';
import { RateLimitBucket } from '../models/RateLimitBucket';
import { env } from '../config/env';

export class MongoRateLimitStore implements Store {
  localKeys = false;
  private windowMs = 900000;
  constructor(public prefix: string) {}
  init(options: Options) { this.windowMs = options.windowMs; }
  private key(value: string) { return createHmac('sha256', env.JWT_SECRET).update(`${this.prefix}:${value}`).digest('hex'); }
  async increment(key: string) {
    const now = new Date(), resetAt = new Date(now.getTime() + this.windowMs);
    const due = { $lte: [{ $ifNull: ['$resetAt', new Date(0)] }, now] };
    const update = [{ $set: { hits: { $cond: [due, 1, { $add: [{ $ifNull: ['$hits', 0] }, 1] }] },
      resetAt: { $cond: [due, resetAt, '$resetAt'] }, expiresAt: new Date(now.getTime() + this.windowMs * 2) } }];
    let record;
    try { record = await RateLimitBucket.findOneAndUpdate({ _id: this.key(key) }, update, { upsert: true, new: true }); }
    catch (error: any) {
      if (error.code !== 11000) throw error;
      record = await RateLimitBucket.findOneAndUpdate({ _id: this.key(key) }, update, { new: true });
    }
    if (!record) throw new Error('Rate limit counter unavailable');
    return { totalHits: record.hits!, resetTime: record.resetAt! };
  }
  async decrement(key: string) { await RateLimitBucket.updateOne({ _id: this.key(key) }, [{ $set: { hits: { $max: [0, { $subtract: ['$hits', 1] }] } } }]); }
  async resetKey(key: string) { await RateLimitBucket.deleteOne({ _id: this.key(key) }); }
}
