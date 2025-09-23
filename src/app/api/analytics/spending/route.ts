import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock spending analytics data
    const spendingData = {
      totalSpent: 2450.75,
      currency: 'USD',
      period: 'monthly',
      categories: [
        { name: 'Food & Dining', amount: 845.20, percentage: 34.5 },
        { name: 'Shopping', amount: 625.15, percentage: 25.5 },
        { name: 'Transportation', amount: 380.90, percentage: 15.5 },
        { name: 'Entertainment', amount: 310.25, percentage: 12.7 },
        { name: 'Bills & Utilities', amount: 289.25, percentage: 11.8 }
      ],
      trends: {
        monthOverMonth: 5.2,
        weekOverWeek: -2.1,
        yearOverYear: 12.8
      },
      topMerchants: [
        { name: 'Amazon', amount: 245.80, transactions: 8 },
        { name: 'Starbucks', amount: 156.90, transactions: 15 },
        { name: 'Uber', amount: 142.35, transactions: 12 }
      ]
    };

    return NextResponse.json({
      success: true,
      data: spendingData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching spending analytics:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch spending analytics' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, categories } = body;

    // Mock filtered spending data
    const filteredData = {
      period: { startDate, endDate },
      filteredCategories: categories || [],
      totalSpent: 1825.40,
      currency: 'USD',
      breakdown: [
        { date: '2025-09-01', amount: 156.75 },
        { date: '2025-09-02', amount: 89.20 },
        { date: '2025-09-03', amount: 245.30 }
      ]
    };

    return NextResponse.json({
      success: true,
      data: filteredData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing spending filter:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process spending filter' 
      },
      { status: 500 }
    );
  }
}