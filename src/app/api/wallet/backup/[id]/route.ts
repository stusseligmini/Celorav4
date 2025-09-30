import { NextResponse } from 'next/server';
import { z } from 'zod';
import { WalletBackupService } from '@/lib/services/walletBackupService';
import { createAuthenticatedRouteHandler, AuthenticatedContext } from '@/lib/routeHandlerUtils';

// Schema for restore options
const restoreSchema = z.object({
  backupId: z.string().uuid(),
  overwriteExisting: z.boolean().optional().default(false),
  restoreTransactions: z.boolean().optional().default(true),
  walletIds: z.array(z.string()).optional(),
});

// GET handler to get a specific backup
export const GET = createAuthenticatedRouteHandler(
  async (context: AuthenticatedContext) => {
    try {
      const { params } = context;
      const backupId = params.id;
      
      // Get the backup
      const backup = await WalletBackupService.getBackup(backupId);
      
      // Check if this backup belongs to the authenticated user
      if (backup.userId !== context.userId) {
        return NextResponse.json(
          { error: 'You do not have permission to access this backup' },
          { status: 403 }
        );
      }
      
      return NextResponse.json({ backup });
    } catch (error) {
      console.error('Error fetching wallet backup:', error);
      return NextResponse.json(
        { error: 'Failed to fetch wallet backup' },
        { status: 500 }
      );
    }
  }
);

// POST handler to restore from a backup
export const POST = createAuthenticatedRouteHandler(
  async (context: AuthenticatedContext) => {
    try {
      const { params } = context;
      const backupId = params.id;
      
      // Parse and validate restore options
      let data;
      try {
        const body = await context.req.json();
        data = restoreSchema.parse({
          ...body,
          backupId, // Add backupId from path parameter
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: `Validation error: ${error.format()}` },
            { status: 400 }
          );
        }
        throw error;
      }
      
      // Get the backup first to verify ownership
      const backup = await WalletBackupService.getBackup(backupId);
      
      // Check if this backup belongs to the authenticated user
      if (backup.userId !== context.userId) {
        return NextResponse.json(
          { error: 'You do not have permission to restore this backup' },
          { status: 403 }
        );
      }
      
      // Restore from the backup
      const result = await WalletBackupService.restoreFromBackup(backupId, {
        overwriteExisting: data.overwriteExisting,
        restoreTransactions: data.restoreTransactions,
        walletIds: data.walletIds,
      });
      
      return NextResponse.json({
        message: 'Backup restored successfully',
        ...result
      });
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return NextResponse.json(
        { error: 'Failed to restore from backup' },
        { status: 500 }
      );
    }
  }
);