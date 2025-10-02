import { NextResponse } from 'next/server';
import { z } from 'zod';
import { WalletBackupService } from '@/lib/services/walletBackupService';
import { createAuthenticatedRouteHandler, AuthenticatedContext } from '@/lib/routeHandlerUtils';
import { getSupabaseClient } from '@/lib/supabaseSingleton';

// Schema for creating a backup schedule
const scheduleSchema = z.object({
  schedule: z.enum(['daily', 'weekly', 'monthly']),
  includeTransactions: z.boolean().optional().default(true),
  walletIds: z.array(z.string()).optional(),
});

// GET handler to get all backup schedules for the current user
export const GET = createAuthenticatedRouteHandler(
  async (context: AuthenticatedContext) => {
    try {
      const userId = context.userId;
      
      // This would need to be implemented in the WalletBackupService
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('wallet_backup_schedules')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        throw new Error(`Failed to get backup schedules: ${error.message}`);
      }
      
      return NextResponse.json({ schedules: data });
    } catch (error) {
      console.error('Error fetching backup schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch backup schedules' },
        { status: 500 }
      );
    }
  }
);

// POST handler to create a new backup schedule
export const POST = createAuthenticatedRouteHandler(
  async (context: AuthenticatedContext) => {
    try {
      const userId = context.userId;
      
      // Parse and validate request body
      let data;
      try {
        data = scheduleSchema.parse(await context.req.json());
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: `Validation error: ${error.format()}` },
            { status: 400 }
          );
        }
        throw error;
      }
      
      // Schedule the backup
      await WalletBackupService.scheduleRecurringBackup(
        userId,
        data.schedule,
        {
          includeTransactions: data.includeTransactions,
          walletIds: data.walletIds,
        }
      );
      
      return NextResponse.json(
        { message: 'Backup schedule created successfully' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating backup schedule:', error);
      return NextResponse.json(
        { error: 'Failed to create backup schedule' },
        { status: 500 }
      );
    }
  },
  {
    validation: {
      body: scheduleSchema
    }
  }
);
