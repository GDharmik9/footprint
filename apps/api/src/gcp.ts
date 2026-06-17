import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { PubSub } from '@google-cloud/pubsub';
import { IngestCarbonEventPayload } from '@footprint/shared-types';
import EventEmitter from 'events';

// Configuration (can be overridden by Env vars)
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'footprint-gcp-project';
const TOPIC_NAME = process.env.PUBSUB_TOPIC || 'carbon-events-topic';
const SUBSCRIPTION_NAME = process.env.PUBSUB_SUBSCRIPTION || 'carbon-events-sub';

// Clients (instantiated lazily or handled with try/catch fallback)
let secretManager: SecretManagerServiceClient | null = null;
let pubsub: PubSub | null = null;

// Local mock event emitter fallback for offline sandbox mode
const localEventEmitter = new EventEmitter();
let isUsingGcpPubSub = false;

try {
  // Check if we are running in an environment with credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
    secretManager = new SecretManagerServiceClient();
    pubsub = new PubSub({ projectId: PROJECT_ID });
    isUsingGcpPubSub = true;
    console.log('GCP Clients initialized successfully.');
  } else {
    console.log('No GCP credentials detected. Falling back to local sandbox event bus.');
  }
} catch (e) {
  console.warn('GCP Client initialization failed. Using local event bus fallback:', e);
}

/**
 * Retrieves a secret from Google Cloud Secret Manager.
 * Falls back to process.env if secret manager is not available.
 */
export async function getSecret(secretName: string): Promise<string> {
  if (secretManager) {
    try {
      const [version] = await secretManager.accessSecretVersion({
        name: `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`,
      });
      const payload = version.payload?.data?.toString();
      if (payload) return payload;
    } catch (e) {
      console.warn(`Failed to fetch secret ${secretName} from GCP Secret Manager, trying environment variable:`, e);
    }
  }
  return process.env[secretName] || '';
}

/**
 * Publishes a carbon ingestion event to the Pub/Sub topic (or local emitter).
 */
export async function publishCarbonEvent(payload: IngestCarbonEventPayload): Promise<void> {
  if (isUsingGcpPubSub && pubsub) {
    try {
      const dataBuffer = Buffer.from(JSON.stringify(payload));
      const topic = pubsub.topic(TOPIC_NAME);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Pub/Sub: Published event ${messageId} to topic: ${TOPIC_NAME}`);
      return;
    } catch (e) {
      console.error('Failed to publish to GCP Pub/Sub, logging to local emitter fallback:', e);
    }
  }

  // Fallback to local process loop
  console.log('Local Bus: Publishing carbon ingestion event locally.');
  localEventEmitter.emit('carbon-event', payload);
}

/**
 * Starts the Pub/Sub subscriber listener (or local emitter listener).
 */
export async function startPubSubSubscriber(
  callback: (payload: IngestCarbonEventPayload) => Promise<void>
): Promise<void> {
  if (isUsingGcpPubSub && pubsub) {
    try {
      const subscription = pubsub.subscription(SUBSCRIPTION_NAME);
      
      // Create subscription if not exists (helpful for setup dev)
      const [exists] = await subscription.exists();
      if (!exists) {
        console.log(`Subscription ${SUBSCRIPTION_NAME} not found. Attempting to create...`);
        const topic = pubsub.topic(TOPIC_NAME);
        const [topicExists] = await topic.exists();
        if (!topicExists) {
          await topic.create();
        }
        await subscription.create({ topic: TOPIC_NAME });
      }

      subscription.on('message', async (message: any) => {
        try {
          console.log(`Pub/Sub Subscriber: Received message ${message.id}`);
          const payload: IngestCarbonEventPayload = JSON.parse(message.data.toString());
          await callback(payload);
          message.ack();
        } catch (err) {
          console.error('Error handling Pub/Sub message:', err);
          message.nack(); // Nack so it gets retried
        }
      });

      console.log(`Pub/Sub Subscriber listening on GCS subscription: ${SUBSCRIPTION_NAME}`);
      return;
    } catch (e) {
      console.error('Failed to bind GCP Pub/Sub subscriber, falling back to local subscriber:', e);
    }
  }

  // Fallback to local process loop
  localEventEmitter.on('carbon-event', async (payload: IngestCarbonEventPayload) => {
    try {
      console.log('Local Subscriber: Handling carbon event payload.');
      await callback(payload);
    } catch (err) {
      console.error('Error processing local subscriber event:', err);
    }
  });

  console.log('Local Subscriber started and listening to local events.');
}
