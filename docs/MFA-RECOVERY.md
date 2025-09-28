# MFA Recovery Process

This document describes the Multi-Factor Authentication (MFA) recovery process implemented in Celora to help users regain access to their accounts when they lose their authentication device or recovery codes.

## Overview

The MFA recovery process is designed to balance security with usability. When a user loses access to their MFA device and recovery codes, they can initiate a recovery process that requires identity verification and administrator approval.

### Recovery Flow

1. **Initiation**: User submits their email address to begin the recovery process
2. **Email Verification**: User confirms access to their email by entering a verification code
3. **Identity Verification**: User provides personal information to verify their identity
4. **Case Creation**: A unique case number is generated for tracking
5. **Administrative Review**: Security team reviews and approves or rejects the request
6. **Recovery Completion**: Once approved, MFA is disabled for the account

## Implementation Components

### Database Schema

The MFA recovery process uses the following tables:

- `mfa_recovery_requests`: Tracks recovery requests and their status
- `security_events`: Logs security events related to the recovery process

### API Endpoints

- `POST /api/mfa/recovery`: Initiates a recovery request
- `GET /api/mfa/recovery`: Checks the status of a recovery request

### UI Components

- `MfaRecoveryProcess`: Component for users to initiate and track recovery
- `MfaRecoveryAdminDashboard`: Component for administrators to manage recovery requests

## Security Considerations

1. **Audit Logging**: All recovery actions are logged in the `security_events` table
2. **Two-Step Verification**: Email verification plus identity verification
3. **Administrative Approval**: Required for all recovery requests
4. **Unique Case Numbers**: Generated for tracking and reference
5. **Rate Limiting**: Applied to prevent abuse

## Testing

You can test the recovery process using the provided Playwright test script:

```
npx playwright test mfa-recovery-test.ts
```

This script tests both the user-facing recovery request process and the admin approval flow.

## Dependencies

- Supabase Authentication
- PostgreSQL Database with RLS policies
- Security event logging system

## Recovery Codes

As a best practice, users should be encouraged to:

1. Store recovery codes in a secure location
2. Generate new recovery codes periodically
3. Keep a backup authentication method (like a secondary device)

## Administrative Guidelines

When reviewing recovery requests, administrators should:

1. Verify the user's identity through secondary channels when possible
2. Check for suspicious patterns in recovery requests
3. Document the verification process in the review notes
4. Complete the recovery process promptly after approval

## Future Enhancements

- Integration with identity verification services
- Risk-based approval workflows
- Support for delegated recovery via trusted contacts
- Multi-step approval for high-security accounts