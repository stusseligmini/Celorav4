import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * AUTO-LINK TRANSFER SYSTEM
 * Automatically links incoming/outgoing Solana transactions to user accounts
 * Uses confidence scoring and intelligent matching algorithms
 */

interface PendingTransferLink {
  id: string;
  signature: string;
  wallet_address: string;
  amount: number;
  token_mint?: string;
  transfer_type: 'incoming' | 'outgoing';
  confidence_score: number;
  auto_link_status: 'pending' | 'linked' | 'ignored' | 'manual_review';
  linked_user_id?: string;
  linked_wallet_id?: string;
  linked_transaction_id?: string;
  time_window_hours: number;
  attempts: number;
  expires_at: string;
  created_at: string;
}

interface AutoLinkSettings {
  user_id: string;
  wallet_id: string;
  enabled: boolean;
  min_confidence_score: number;
  time_window_hours: number;
  notification_enabled: boolean;
  auto_confirm_enabled: boolean;
}

interface MatchResult {
  matched: boolean;
  confidence: number;
  user_id?: string;
  wallet_id?: string;
  reasoning: string[];
}

/**
 * POST /api/solana/auto-link
 * Process pending transfer links and attempt to match them to user accounts
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication and admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action = 'process_pending', force_process = false, signature = null } = body;

    let processedLinks = 0;
    let linkedTransactions = 0;
    let errors = 0;
    const results: any[] = [];

    if (action === 'process_pending') {
      // Get all pending transfer links that haven't expired
      let query = supabase
        .from('pending_transfer_links')
        .select('*')
        .eq('auto_link_status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (signature) {
        query = query.eq('signature', signature);
      }

      if (!force_process) {
        // Only process links that haven't been attempted recently
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        query = query.or(`last_attempt_at.is.null,last_attempt_at.lt.${fiveMinutesAgo}`);
      }

      const { data: pendingLinks, error: fetchError } = await query.limit(50);

      if (fetchError) {
        console.error('Error fetching pending links:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch pending links' },
          { status: 500 }
        );
      }

      console.log(`🔄 Processing ${pendingLinks?.length || 0} pending transfer links...`);

      // Process each pending link
      for (const link of pendingLinks || []) {
        try {
          processedLinks++;
          
          // Update attempt count
          await supabase
            .from('pending_transfer_links')
            .update({
              attempts: link.attempts + 1,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', link.id);

          // Try to match this transaction to a user account
          const matchResult = await findMatchingAccount(supabase, link);
          
          if (matchResult.matched && matchResult.confidence >= 0.8) {
            // High confidence match - auto-link
            const linkResult = await linkTransactionToAccount(supabase, link, matchResult);
            
            if (linkResult.success) {
              linkedTransactions++;
              results.push({
                signature: link.signature,
                status: 'linked',
                confidence: matchResult.confidence,
                user_id: matchResult.user_id,
                reasoning: matchResult.reasoning
              });

              // Send notification if enabled
              await createAutoLinkNotification(supabase, link, matchResult, 'success');
            } else {
              errors++;
              results.push({
                signature: link.signature,
                status: 'link_failed',
                error: linkResult.error
              });
            }
          } else if (matchResult.confidence >= 0.5) {
            // Medium confidence - flag for manual review
            await supabase
              .from('pending_transfer_links')
              .update({ auto_link_status: 'manual_review' })
              .eq('id', link.id);

            results.push({
              signature: link.signature,
              status: 'manual_review',
              confidence: matchResult.confidence,
              reasoning: matchResult.reasoning
            });

            // Send notification for manual review
            await createAutoLinkNotification(supabase, link, matchResult, 'manual_review');
          } else {
            // Low confidence - ignore for now
            if (link.attempts >= 5) {
              await supabase
                .from('pending_transfer_links')
                .update({ auto_link_status: 'ignored' })
                .eq('id', link.id);
            }

            results.push({
              signature: link.signature,
              status: 'low_confidence',
              confidence: matchResult.confidence,
              reasoning: matchResult.reasoning
            });
          }
        } catch (linkError) {
          console.error(`Error processing link ${link.signature}:`, linkError);
          errors++;
          results.push({
            signature: link.signature,
            status: 'error',
            error: linkError instanceof Error ? linkError.message : 'Unknown error'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-link processing completed',
      stats: {
        processedLinks,
        linkedTransactions,
        errors,
        successRate: processedLinks > 0 ? (linkedTransactions / processedLinks * 100).toFixed(1) : 0
      },
      results: results.slice(0, 10), // Return first 10 results
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-link API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/solana/auto-link
 * Get auto-link settings and pending transfers for current user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const walletId = url.searchParams.get('wallet_id');
    const status = url.searchParams.get('status');

    // Get user's auto-link settings
    let settingsQuery = supabase
      .from('auto_link_settings')
      .select('*')
      .eq('user_id', user.id);

    if (walletId) {
      settingsQuery = settingsQuery.eq('wallet_id', walletId);
    }

    const { data: settings } = await settingsQuery;

    // Get user's wallets for context
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, wallet_name, public_key, wallet_type, network')
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Get pending transfers for user's wallets
    const walletAddresses = wallets?.map(w => w.public_key) || [];
    
    let transfersQuery = supabase
      .from('pending_transfer_links')
      .select('*')
      .in('wallet_address', walletAddresses);

    if (status) {
      transfersQuery = transfersQuery.eq('auto_link_status', status);
    }

    const { data: pendingTransfers } = await transfersQuery
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent successful auto-links
    const { data: recentLinks } = await supabase
      .from('auto_link_transfers')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        settings: settings || [],
        pending_transfers: pendingTransfers || [],
        auto_link_transfers: recentLinks || [],
        wallets: wallets || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-link GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/solana/auto-link
 * Update auto-link settings for a wallet
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      wallet_id, 
      enabled = true, 
      min_confidence_score = 0.8, 
      time_window_hours = 6,
      notification_enabled = true,
      auto_confirm_enabled = false 
    } = body;

    if (!wallet_id) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      );
    }

    // Verify wallet belongs to user
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('id', wallet_id)
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found or unauthorized' },
        { status: 404 }
      );
    }

    // Upsert auto-link settings
    const { data, error } = await supabase
      .from('auto_link_settings')
      .upsert({
        user_id: user.id,
        wallet_id,
        enabled,
        min_confidence_score,
        time_window_hours,
        notification_enabled,
        auto_confirm_enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,wallet_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating auto-link settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-link settings updated',
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-link PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Find matching user account for a pending transfer link
 */
async function findMatchingAccount(supabase: any, link: PendingTransferLink): Promise<MatchResult> {
  const reasoning: string[] = [];
  let confidence = 0;
  let matchedUserId: string | undefined;
  let matchedWalletId: string | undefined;

  try {
    // Strategy 1: Exact wallet address match
    const { data: exactMatch } = await supabase
      .from('wallets')
      .select('id, user_id, wallet_name')
      .eq('public_key', link.wallet_address)
      .eq('is_active', true)
      .single();

    if (exactMatch) {
      confidence += 0.9;
      matchedUserId = exactMatch.user_id;
      matchedWalletId = exactMatch.id;
      reasoning.push(`Exact wallet address match: ${exactMatch.wallet_name}`);
    }

    // Strategy 2: Recent transaction history
    const { data: recentTxs } = await supabase
      .from('transactions')
      .select('user_id, wallet_id')
      .or(`from_address.eq.${link.wallet_address},to_address.eq.${link.wallet_address}`)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    if (recentTxs && recentTxs.length > 0) {
      const userCounts = recentTxs.reduce((acc: any, tx: any) => {
        acc[tx.user_id] = (acc[tx.user_id] || 0) + 1;
        return acc;
      }, {});

      const mostFrequentUser = Object.keys(userCounts).reduce((a, b) => 
        userCounts[a] > userCounts[b] ? a : b
      );

      if (userCounts[mostFrequentUser] >= 2) {
        confidence += 0.3;
        if (!matchedUserId) matchedUserId = mostFrequentUser;
        reasoning.push(`Recent transaction history (${userCounts[mostFrequentUser]} matches)`);
      }
    }

    // Strategy 3: Similar transaction amounts (for recurring payments)
    const { data: similarAmounts } = await supabase
      .from('transactions')
      .select('user_id, wallet_id, amount')
      .gte('amount', link.amount * 0.95)
      .lte('amount', link.amount * 1.05)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(3);

    if (similarAmounts && similarAmounts.length > 0) {
      confidence += 0.2;
      reasoning.push(`Similar transaction amounts found (${similarAmounts.length} matches)`);
    }

    // Strategy 4: Time-based correlation
    const timeWindow = link.time_window_hours * 60 * 60 * 1000;
    const linkTime = new Date(link.created_at).getTime();
    
    const { data: timeCorrelated } = await supabase
      .from('transactions')
      .select('user_id, wallet_id')
      .gte('created_at', new Date(linkTime - timeWindow).toISOString())
      .lte('created_at', new Date(linkTime + timeWindow).toISOString())
      .neq('status', 'failed')
      .limit(10);

    if (timeCorrelated && timeCorrelated.length > 0 && matchedUserId) {
      const userMatches = timeCorrelated.filter((tx: any) => tx.user_id === matchedUserId).length;
      if (userMatches > 0) {
        confidence += 0.1 * userMatches;
        reasoning.push(`Time-correlated transactions (${userMatches} within window)`);
      }
    }

    // Normalize confidence score
    confidence = Math.min(confidence, 1.0);

    return {
      matched: confidence >= 0.5,
      confidence,
      user_id: matchedUserId,
      wallet_id: matchedWalletId,
      reasoning
    };

  } catch (error) {
    console.error('Error in findMatchingAccount:', error);
    return {
      matched: false,
      confidence: 0,
      reasoning: ['Error during matching process']
    };
  }
}

/**
 * Link a transaction to a user account
 */
async function linkTransactionToAccount(supabase: any, link: PendingTransferLink, match: MatchResult) {
  try {
    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: match.user_id,
        wallet_id: match.wallet_id,
        transaction_type: link.transfer_type === 'incoming' ? 'receive' : 'send',
        amount: link.amount,
        currency: link.token_mint ? 'SPL' : 'SOL',
        status: 'completed',
        tx_hash: link.signature,
        description: `Auto-linked ${link.transfer_type} transfer`,
        metadata: {
          auto_linked: true,
          confidence_score: match.confidence,
          reasoning: match.reasoning,
          original_link_id: link.id
        }
      })
      .select()
      .single();

    if (txError) {
      return { success: false, error: txError.message };
    }

    // Update pending link status
    const { error: updateError } = await supabase
      .from('pending_transfer_links')
      .update({
        auto_link_status: 'linked',
        linked_user_id: match.user_id,
        linked_wallet_id: match.wallet_id,
        linked_transaction_id: transaction.id,
        confidence_score: match.confidence
      })
      .eq('id', link.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, transaction_id: transaction.id };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create auto-link notification
 */
async function createAutoLinkNotification(
  supabase: any, 
  link: PendingTransferLink, 
  match: MatchResult, 
  type: 'success' | 'manual_review'
) {
  try {
    const title = type === 'success' ? 
      '✅ Transaction Linked' : 
      '❓ Transaction Needs Review';
    
    const message = type === 'success' ? 
      `Transaction automatically linked to your wallet (${(match.confidence * 100).toFixed(0)}% confidence)` :
      `A transaction requires manual review and linking (${(match.confidence * 100).toFixed(0)}% confidence)`;

    await supabase
      .from('notifications')
      .insert({
        user_id: match.user_id,
        title,
        message,
        type: 'transaction',
        priority: type === 'manual_review' ? 'medium' : 'low',
        metadata: {
          signature: link.signature,
          amount: link.amount,
          confidence: match.confidence,
          auto_link_type: type
        }
      });

  } catch (error) {
    console.error('Error creating auto-link notification:', error);
  }
}