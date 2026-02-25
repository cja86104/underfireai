/**
 * UnderFireAI - Webhooks Module
 *
 * Outbound webhook notifications for enterprise integrations.
 */

export {
  // Functions
  sendSessionCompletedWebhook,
  sendTestWebhook,
  getWebhooksForEvent,
  generateSignature,
  verifySignature,

  // Types
  type WebhookConfig,
  type WebhookPayload,
  type SessionCompletedPayload,
  type WebhookDeliveryResult,
} from './webhook-service';
