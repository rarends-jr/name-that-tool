import { createClient, RedisClientType } from 'redis';
declare global {
  // eslint-disable-next-line no-var
  var redis: {
    client: RedisClientType<any> | null;
    promise: Promise<RedisClientType<any>> | null;
  } | undefined;
}

const REDIS_URL = process.env.REDIS_REDIS_URL;
if (!REDIS_URL) {
  throw new Error(
    'Please define the REDIS_URL environment variable inside .env.local'
  );
}
const cached = global.redis ?? (global.redis = { client: null, promise: null });

async function redisConnect() {
  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    const client = createClient({ url: REDIS_URL });
    client.on('error', err => console.log('Redis Client Error', err));
    cached.promise = client.connect().then(() => client as RedisClientType<any>);
  }
  cached.client = await cached.promise;
  return cached.client;
}

export default redisConnect;