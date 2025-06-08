export interface UsageData {
  start_time: number;
  end_time: number;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  input_audio_tokens: number;
  output_audio_tokens: number;
  num_model_requests: number;
  project_id: string | null;
  user_id: string | null;
  api_key_id: string | null;
  model: string | null;
  batch: boolean | null;
}

export interface CostData {
  start_time: number;
  end_time: number;
  amount_value: number;
  currency: string;
  line_item: string | null;
  project_id: string | null;
  organization_id: string;
}

export interface UsageApiResponse {
  object: string;
  data: Array<{
    object: string;
    start_time: number;
    end_time: number;
    results: Array<{
      object: string;
      input_tokens: number;
      output_tokens: number;
      input_cached_tokens: number;
      input_audio_tokens: number;
      output_audio_tokens: number;
      num_model_requests: number;
      project_id: string | null;
      user_id: string | null;
      api_key_id: string | null;
      model: string | null;
      batch: boolean | null;
    }>;
  }>;
  next_page?: string;
}

export interface CostApiResponse {
  object: string;
  data: Array<{
    object: string;
    start_time: number;
    end_time: number;
    results: Array<{
      object: string;
      amount: {
        value: number;
        currency: string;
      };
      line_item: string | null;
      project_id: string | null;
      organization_id: string;
    }>;
  }>;
  next_page?: string;
}

export interface AnalyticsParams {
  start_time: number;
  end_time?: number;
  bucket_width?: '1m' | '1h' | '1d';
  project_ids?: string[];
  user_ids?: string[];
  api_key_ids?: string[];
  models?: string[];
  batch?: boolean;
  group_by?: string[];
  limit?: number;
  page?: string;
}

class OpenAIAnalyticsService {
  private adminApiKey: string;
  private baseUrl = 'https://api.openai.com/v1/organization';

  constructor() {
    this.adminApiKey = process.env.ADMIN_OPENAI_KEY || '';
    if (!this.adminApiKey) {
      console.warn('ADMIN_OPENAI_KEY environment variable is not set - analytics will be limited');
      // במקום לזרוק שגיאה בזמן build, נדחה את הבדיקה לזמן runtime
    }
  }

  private async makeRequest<T>(endpoint: string, params: AnalyticsParams): Promise<T> {
    if (!this.adminApiKey) {
      throw new Error('ADMIN_OPENAI_KEY environment variable is required for analytics API calls');
    }
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // בניית query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => url.searchParams.append(key, item.toString()));
        } else {
          url.searchParams.append(key, value.toString());
        }
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.adminApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getUsageData(params: AnalyticsParams): Promise<UsageData[]> {
    let allData: UsageData[] = [];
    let currentParams = { ...params };

    do {
      const response = await this.makeRequest<UsageApiResponse>('/usage/completions', currentParams);
      
      // עיבוד הנתונים
      const processedData = response.data.flatMap(bucket => 
        bucket.results.map(result => ({
          start_time: bucket.start_time,
          end_time: bucket.end_time,
          input_tokens: result.input_tokens,
          output_tokens: result.output_tokens,
          input_cached_tokens: result.input_cached_tokens,
          input_audio_tokens: result.input_audio_tokens,
          output_audio_tokens: result.output_audio_tokens,
          num_model_requests: result.num_model_requests,
          project_id: result.project_id,
          user_id: result.user_id,
          api_key_id: result.api_key_id,
          model: result.model,
          batch: result.batch,
        }))
      );

      allData = allData.concat(processedData);

      // pagination
      if (response.next_page) {
        currentParams.page = response.next_page;
      } else {
        break;
      }
    } while (true);

    return allData;
  }

  async getCostData(params: AnalyticsParams): Promise<CostData[]> {
    let allData: CostData[] = [];
    let currentParams = { ...params };

    do {
      const response = await this.makeRequest<CostApiResponse>('/costs', currentParams);
      
      // עיבוד הנתונים
      const processedData = response.data.flatMap(bucket => 
        bucket.results.map(result => ({
          start_time: bucket.start_time,
          end_time: bucket.end_time,
          amount_value: result.amount.value,
          currency: result.amount.currency,
          line_item: result.line_item,
          project_id: result.project_id,
          organization_id: result.organization_id,
        }))
      );

      allData = allData.concat(processedData);

      // pagination
      if (response.next_page) {
        currentParams.page = response.next_page;
      } else {
        break;
      }
    } while (true);

    return allData;
  }

  // שאיבת נתונים עבור התקופה האחרונה
  async getRecentUsage(days: number = 30): Promise<UsageData[]> {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (days * 24 * 60 * 60);

    return this.getUsageData({
      start_time: startTime,
      end_time: endTime,
      bucket_width: '1d',
      group_by: ['model', 'project_id', 'api_key_id'],
      limit: 100,
    });
  }

  async getRecentCosts(days: number = 30): Promise<CostData[]> {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (days * 24 * 60 * 60);

    return this.getCostData({
      start_time: startTime,
      end_time: endTime,
      bucket_width: '1d',
      group_by: ['line_item', 'project_id'],
      limit: 100,
    });
  }

  // חישוב סטטיסטיקות מצטברות
  calculateTotalUsage(usageData: UsageData[]) {
    return usageData.reduce((totals, usage) => ({
      totalInputTokens: totals.totalInputTokens + usage.input_tokens,
      totalOutputTokens: totals.totalOutputTokens + usage.output_tokens,
      totalAudioInputTokens: totals.totalAudioInputTokens + usage.input_audio_tokens,
      totalAudioOutputTokens: totals.totalAudioOutputTokens + usage.output_audio_tokens,
      totalRequests: totals.totalRequests + usage.num_model_requests,
      totalCachedTokens: totals.totalCachedTokens + usage.input_cached_tokens,
    }), {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalAudioInputTokens: 0,
      totalAudioOutputTokens: 0,
      totalRequests: 0,
      totalCachedTokens: 0,
    });
  }

  calculateTotalCosts(costData: CostData[]) {
    return costData.reduce((total, cost) => total + cost.amount_value, 0);
  }

  // ניתוח לפי מודל
  analyzeByModel(usageData: UsageData[]) {
    const modelStats = new Map();

    usageData.forEach(usage => {
      if (usage.model) {
        const existing = modelStats.get(usage.model) || {
          model: usage.model,
          inputTokens: 0,
          outputTokens: 0,
          requests: 0,
          audioInputTokens: 0,
          audioOutputTokens: 0,
        };

        existing.inputTokens += usage.input_tokens;
        existing.outputTokens += usage.output_tokens;
        existing.requests += usage.num_model_requests;
        existing.audioInputTokens += usage.input_audio_tokens;
        existing.audioOutputTokens += usage.output_audio_tokens;

        modelStats.set(usage.model, existing);
      }
    });

    return Array.from(modelStats.values()).sort((a, b) => b.requests - a.requests);
  }

  // ניתוח עלויות לפי סוג שירות
  analyzeCostsByLineItem(costData: CostData[]) {
    const lineItemStats = new Map();

    costData.forEach(cost => {
      const lineItem = cost.line_item || 'Other';
      const existing = lineItemStats.get(lineItem) || {
        lineItem,
        totalCost: 0,
        currency: cost.currency,
      };

      existing.totalCost += cost.amount_value;
      lineItemStats.set(lineItem, existing);
    });

    return Array.from(lineItemStats.values()).sort((a, b) => b.totalCost - a.totalCost);
  }

  // נתונים יומיים לגרפים
  getDailyBreakdown(usageData: UsageData[], costData: CostData[]) {
    const dailyData = new Map();

    // עיבוד נתוני שימוש
    usageData.forEach(usage => {
      const date = new Date(usage.start_time * 1000).toISOString().split('T')[0];
      const existing = dailyData.get(date) || {
        date,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
        costs: 0,
      };

      existing.inputTokens += usage.input_tokens;
      existing.outputTokens += usage.output_tokens;
      existing.requests += usage.num_model_requests;

      dailyData.set(date, existing);
    });

    // עיבוד נתוני עלויות
    costData.forEach(cost => {
      const date = new Date(cost.start_time * 1000).toISOString().split('T')[0];
      const existing = dailyData.get(date) || {
        date,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
        costs: 0,
      };

      existing.costs += cost.amount_value;
      dailyData.set(date, existing);
    });

    return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const openaiAnalytics = new OpenAIAnalyticsService(); 