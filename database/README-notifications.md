# Notification System with Feature Flag Control

The notification system in Celora V2 is fully controlled by feature flags to allow for gradual rollout and controlled access to different notification features.

## Feature Flag Structure

The notification system uses a hierarchical feature flag structure:

- `notifications` - Master toggle for the entire notification system
- Channel-specific flags:
  - `notifications_in_app` - Controls in-app notifications
  - `notifications_push` - Controls browser push notifications
  - `notifications_email` - Controls email notifications
  - `notifications_sms` - Controls SMS notifications
- API flags:
  - `notifications_api` - Controls access to notification API endpoints

## Database Schema

The notification system uses the following database tables:

1. `notifications` - Stores all notification records
2. `notification_preferences` - Stores user preferences for notifications
3. `push_subscriptions` - Stores web push notification subscriptions
4. `push_notification_keys` - Stores VAPID keys for push notifications
5. `feature_flags` - Stores feature flag configurations

## Push Notification Browser Support

Push notifications have browser-specific feature flag checks:

- Chrome: Checks `notifications_push_chrome` feature flag
- Firefox: Checks `notifications_push_firefox` feature flag 
- Safari: Checks `notifications_push_safari` feature flag

These allow for gradually rolling out push notifications to different browser platforms.

## Adding New Notification Types

When adding a new notification type:

1. Create a new type-specific feature flag (e.g., `notifications_type_transaction`)
2. Update the notification manager to check this flag before sending
3. Add the flag to the database in the `DEPLOY-DATABASE-NOW.sql` file

## Testing Feature Flag Controls

To test notification feature flag controls:

1. Use the admin interface to toggle different notification flags
2. For testing push notifications with targeting rules:
   - Set `user_percentage` to control rollout percentage
   - Use targeting rules to target specific user groups

## Default Configuration

By default, the following flags are enabled:
- `notifications` (master toggle)
- `notifications_in_app`
- `notifications_api`

Push, email, and SMS notifications are disabled by default and should be enabled selectively based on testing and rollout plans.

## RLS Policies

The notification system uses Row Level Security (RLS) policies to ensure users can only access their own notifications and preferences. Feature flag updates are restricted to admin users only.