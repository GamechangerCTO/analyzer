import { NextRequest, NextResponse } from 'next/server';
import { openaiAnalytics } from '@/lib/openai-analytics';

// Cache for analytics data (5 minutes)
let analyticsCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const refresh = searchParams.get('refresh') === 'true';

    // Check cache
    if (!refresh && analyticsCache && (Date.now() - analyticsCache.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: analyticsCache.data,
        cached: true,
        cacheAge: Math.floor((Date.now() - analyticsCache.timestamp) / 1000),
      });
    }

    // Fetch fresh data from OpenAI
    console.log(`🔄 Fetching OpenAI analytics for last ${days} days...`);
    console.log(`📋 Data source: ${openaiAnalytics.getDataSource()}`);
    
    const [usageData, costData] = await Promise.all([
      openaiAnalytics.getRecentUsage(days),
      openaiAnalytics.getRecentCosts(days),
    ]);

    console.log(`📊 Fetched ${usageData.length} usage records and ${costData.length} cost records`);

    // Calculate analytics
    const totalUsage = openaiAnalytics.calculateTotalUsage(usageData);
    const totalCosts = openaiAnalytics.calculateTotalCosts(costData);
    const modelBreakdown = openaiAnalytics.analyzeByModel(usageData);
    const costBreakdown = openaiAnalytics.analyzeCostsByLineItem(costData);
    const dailyBreakdown = openaiAnalytics.getDailyBreakdown(usageData, costData);

    // Calculate additional metrics
    const averageDailyCost = totalCosts / Math.max(days, 1);
    const averageRequestCost = totalCosts / Math.max(totalUsage.totalRequests, 1);
    const tokensPerRequest = (totalUsage.totalInputTokens + totalUsage.totalOutputTokens) / Math.max(totalUsage.totalRequests, 1);

    // Top models by usage
    const topModels = modelBreakdown.slice(0, 5);

    // Recent trends (last 7 days vs previous 7 days)
    const recentDays = dailyBreakdown.slice(-7);
    const previousDays = dailyBreakdown.slice(-14, -7);
    
    const recentTotalCost = recentDays.reduce((sum, day) => sum + day.costs, 0);
    const previousTotalCost = previousDays.reduce((sum, day) => sum + day.costs, 0);
    const costTrend = previousTotalCost > 0 ? ((recentTotalCost - previousTotalCost) / previousTotalCost) * 100 : 0;

    const recentTotalRequests = recentDays.reduce((sum, day) => sum + day.requests, 0);
    const previousTotalRequests = previousDays.reduce((sum, day) => sum + day.requests, 0);
    const requestsTrend = previousTotalRequests > 0 ? ((recentTotalRequests - previousTotalRequests) / previousTotalRequests) * 100 : 0;

    const analyticsResult = {
      // Summary metrics
      summary: {
        totalCosts: Number(totalCosts.toFixed(2)),
        totalRequests: totalUsage.totalRequests,
        totalInputTokens: totalUsage.totalInputTokens,
        totalOutputTokens: totalUsage.totalOutputTokens,
        totalAudioInputTokens: totalUsage.totalAudioInputTokens,
        totalAudioOutputTokens: totalUsage.totalAudioOutputTokens,
        totalCachedTokens: totalUsage.totalCachedTokens,
        averageDailyCost: Number(averageDailyCost.toFixed(2)),
        averageRequestCost: Number(averageRequestCost.toFixed(4)),
        tokensPerRequest: Number(tokensPerRequest.toFixed(0)),
      },

      // Trends
      trends: {
        costTrend: Number(costTrend.toFixed(1)),
        requestsTrend: Number(requestsTrend.toFixed(1)),
      },

      // Breakdowns
      modelBreakdown: topModels.map(model => ({
        ...model,
        totalTokens: model.inputTokens + model.outputTokens,
        costEstimate: 0, // Will be calculated based on model pricing
      })),

      costBreakdown: costBreakdown.map(item => ({
        ...item,
        totalCost: Number(item.totalCost.toFixed(2)),
      })),

      // Daily data for charts
      dailyBreakdown: dailyBreakdown.map(day => ({
        ...day,
        costs: Number(day.costs.toFixed(2)),
        totalTokens: day.inputTokens + day.outputTokens,
      })),

      // Additional insights
      insights: {
        mostExpensiveDay: dailyBreakdown.reduce((max, day) => 
          day.costs > max.costs ? day : max, dailyBreakdown[0] || { date: 'N/A', costs: 0 }
        ),
        
        mostActiveDay: dailyBreakdown.reduce((max, day) => 
          day.requests > max.requests ? day : max, dailyBreakdown[0] || { date: 'N/A', requests: 0 }
        ),

        topModel: topModels[0] || { model: 'N/A', requests: 0 },
        
        efficiency: {
          cachedTokensRatio: totalUsage.totalInputTokens > 0 ? 
            (totalUsage.totalCachedTokens / totalUsage.totalInputTokens) * 100 : 0,
          audioUsageRatio: (totalUsage.totalInputTokens + totalUsage.totalOutputTokens) > 0 ?
            ((totalUsage.totalAudioInputTokens + totalUsage.totalAudioOutputTokens) / 
             (totalUsage.totalInputTokens + totalUsage.totalOutputTokens)) * 100 : 0,
        },
      },

      // Metadata
      metadata: {
        dataPoints: usageData.length + costData.length,
        periodDays: days,
        lastUpdated: new Date().toISOString(),
        currency: 'USD',
        source: openaiAnalytics.getDataSource(),
        dataType: openaiAnalytics.getDataType(),
      },
    };

    // Update cache
    analyticsCache = {
      data: analyticsResult,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      success: true,
      data: analyticsResult,
      cached: false,
    });

  } catch (error) {
    console.error('❌ Error fetching OpenAI analytics:', error);
    
    // טיפול שגיאות מפורט יותר
    let errorMessage = 'Unknown error';
    let errorCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // זיהוי שגיאות ספציפיות של OpenAI API
      if (error.message.includes('Limit exceeds the maximum')) {
        errorMessage = 'בקשה לתקופה ארוכה מדי. נסה תקופה קצרה יותר.';
        errorCode = 400;
      } else if (error.message.includes('invalid_request_error')) {
        errorMessage = 'פרמטרים לא תקינים לAPI של OpenAI';
        errorCode = 400;
      } else if (error.message.includes('ADMIN_OPENAI_KEY')) {
        errorMessage = 'מפתח API של OpenAI לא מוגדר';
        errorCode = 503;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics data',
      message: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? {
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      } : undefined,
    }, { status: errorCode });
  }
}

// POST endpoint for manual refresh
export async function POST(request: NextRequest) {
  try {
    // Clear cache
    analyticsCache = null;
    
    // Fetch fresh data
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    // Redirect to GET with refresh=true
    const url = new URL(request.url);
    url.searchParams.set('refresh', 'true');
    url.searchParams.set('days', days.toString());
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: request.headers,
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Analytics data refreshed successfully',
      data: data.data,
    });

  } catch (error) {
    console.error('❌ Error refreshing analytics:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh analytics data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 