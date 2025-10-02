import { NextResponse } from 'next/server';
import { z } from 'zod';
import { WalletBackupService } from '@/lib/services/walletBackupService';
import { createAuthenticatedRouteHandler, AuthenticatedContext } from '@/lib/routeHandlerUtils';

// Schema for creating a backup
const createBackupSchema = z.object({
  includeTransactions: z.boolean().optional().default(true),
  walletIds: z.array(z.string()).optional(),
  transactionsSince: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

// GET handler to get all backups for the current user
export const GET = createAuthenticatedRouteHandler(
  async (context: AuthenticatedContext) => {
    try {
      const userId = context.userId;
      const backups = await WalletBackupService.getBackups(userId);
      
      return NextResponse.json({ backups });
    } catch (error) {
      console.error('Error fetching wallet backups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch wallet backups' },
        { status: 500 }
      );
    }
  }
);

// POST handler to create a new backup
export const POST = createAuthenticatedRouteHandler(
  async (context: AuthenticatedContext) => {
    try {
      const userId = context.userId;
      let data;
      
      try {
        data = createBackupSchema.parse(await context.req.json());
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: `Validation error: ${error.format()}` },
            { status: 400 }
          );
        }
        throw error;
      }
      
      const backup = await WalletBackupService.createBackup(userId, {
        includeTransactions: data.includeTransactions,
        walletIds: data.walletIds,
        transactionsSince: data.transactionsSince,
      });
      
      return NextResponse.json({ backup }, { status: 201 });
    } catch (error) {
      console.error('Error creating wallet backup:', error);
      return NextResponse.json(
        { error: 'Failed to create wallet backup' },
        { status: 500 }
      );
    }
  },
  { 
    validation: {
      body: createBackupSchema
    }
  }
);
