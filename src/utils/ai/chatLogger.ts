/**
 * Murugan App - AI Chat Log Architecture
 * Structured storage for Ask Gugan chat logs with analytics
 */

export interface DeviceInfo {
  os: 'Android' | 'iOS' | 'Web';
  model: string;
  ip?: string;
  userAgent?: string;
}

export interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: string;
  tokenUsage?: number;
  latencyMs?: number;
}

export interface ChatMeta {
  totalMessages: number;
  imageQueries: number;
  audioQueries: number;
  aiLatencyAvg: number;
  firstMessageAt: string;
  lastMessageAt: string;
  sessionDurationMs: number;
}

export interface AIChatLog {
  chatId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deviceInfo: DeviceInfo;
  meta: ChatMeta;
  messages: ChatMessage[];
  tags?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  userSatisfaction?: number; // 1-5 rating
}

/**
 * Chat Logger Class
 * Manages AI chat logging with analytics
 */
export class ChatLogger {
  private currentChat: AIChatLog | null = null;
  private chatStartTime: number = 0;

  /**
   * Initialize a new chat session
   */
  async startChat(userId: string): Promise<string> {
    const chatId = this.generateChatId();
    this.chatStartTime = Date.now();

    this.currentChat = {
      chatId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deviceInfo: this.getDeviceInfo(),
      meta: {
        totalMessages: 0,
        imageQueries: 0,
        audioQueries: 0,
        aiLatencyAvg: 0,
        firstMessageAt: '',
        lastMessageAt: '',
        sessionDurationMs: 0,
      },
      messages: [],
    };

    console.log(`[ChatLogger] Started chat session: ${chatId}`);
    return chatId;
  }

  /**
   * Log a user message
   */
  async logUserMessage(
    content: string,
    imageUrl?: string,
    audioUrl?: string
  ): Promise<void> {
    if (!this.currentChat) {
      throw new Error('No active chat session');
    }

    const message: ChatMessage = {
      type: 'user',
      content,
      imageUrl,
      audioUrl,
      timestamp: new Date().toISOString(),
    };

    this.currentChat.messages.push(message);
    this.updateMeta(message);
    
    console.log('[ChatLogger] Logged user message');
  }

  /**
   * Log an AI response
   */
  async logAIResponse(
    content: string,
    latencyMs: number,
    tokenUsage?: number
  ): Promise<void> {
    if (!this.currentChat) {
      throw new Error('No active chat session');
    }

    const message: ChatMessage = {
      type: 'ai',
      content,
      timestamp: new Date().toISOString(),
      latencyMs,
      tokenUsage,
    };

    this.currentChat.messages.push(message);
    this.updateMeta(message);

    console.log(`[ChatLogger] Logged AI response (latency: ${latencyMs}ms)`);
  }

  /**
   * Update chat metadata
   */
  private updateMeta(message: ChatMessage): void {
    if (!this.currentChat) return;

    const meta = this.currentChat.meta;

    // Update message counts
    meta.totalMessages++;
    if (message.imageUrl) meta.imageQueries++;
    if (message.audioUrl) meta.audioQueries++;

    // Update timestamps
    if (!meta.firstMessageAt) {
      meta.firstMessageAt = message.timestamp;
    }
    meta.lastMessageAt = message.timestamp;

    // Update average latency
    if (message.type === 'ai' && message.latencyMs) {
      const aiMessages = this.currentChat.messages.filter(
        (m) => m.type === 'ai' && m.latencyMs
      );
      const totalLatency = aiMessages.reduce((sum, m) => sum + (m.latencyMs || 0), 0);
      meta.aiLatencyAvg = totalLatency / aiMessages.length;
    }

    // Update session duration
    meta.sessionDurationMs = Date.now() - this.chatStartTime;

    this.currentChat.updatedAt = new Date().toISOString();
  }

  /**
   * End chat session and save to backend
   */
  async endChat(userSatisfaction?: number): Promise<void> {
    if (!this.currentChat) {
      console.warn('[ChatLogger] No active chat to end');
      return;
    }

    // Add user satisfaction if provided
    if (userSatisfaction) {
      this.currentChat.userSatisfaction = userSatisfaction;
    }

    // Extract tags from messages (keywords)
    this.currentChat.tags = this.extractTags(this.currentChat.messages);

    // Analyze sentiment (simple version)
    this.currentChat.sentiment = this.analyzeSentiment(this.currentChat.messages);

    try {
      // Save to backend
      await this.saveChatToBackend(this.currentChat);
      console.log(`[ChatLogger] Chat session ended: ${this.currentChat.chatId}`);
    } catch (error) {
      console.error('[ChatLogger] Failed to save chat:', error);
      // Save to local storage as backup
      this.saveChatToLocalStorage(this.currentChat);
    }

    this.currentChat = null;
    this.chatStartTime = 0;
  }

  /**
   * Save chat to backend
   */
  private async saveChatToBackend(chat: AIChatLog): Promise<void> {
    const response = await fetch('/api/ai/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chat),
    });

    if (!response.ok) {
      throw new Error(`Failed to save chat: ${response.statusText}`);
    }
  }

  /**
   * Save chat to local storage as backup
   */
  private saveChatToLocalStorage(chat: AIChatLog): void {
    try {
      const key = `chat_${chat.chatId}`;
      localStorage.setItem(key, JSON.stringify(chat));
      console.log('[ChatLogger] Chat saved to local storage');
    } catch (error) {
      console.error('[ChatLogger] Failed to save to local storage:', error);
    }
  }

  /**
   * Extract keywords/tags from messages
   */
  private extractTags(messages: ChatMessage[]): string[] {
    const keywords = new Set<string>();
    const commonWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with'];

    messages.forEach((message) => {
      if (message.type === 'user') {
        const words = message.content.toLowerCase().split(/\s+/);
        words.forEach((word) => {
          if (word.length > 4 && !commonWords.includes(word)) {
            keywords.add(word);
          }
        });
      }
    });

    return Array.from(keywords).slice(0, 10); // Top 10 keywords
  }

  /**
   * Analyze sentiment (simple version)
   */
  private analyzeSentiment(messages: ChatMessage[]): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'thanks', 'thank you', 'wonderful', 'blessings', 'blessed'];
    const negativeWords = ['bad', 'wrong', 'error', 'problem', 'issue', 'difficult'];

    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach((message) => {
      const content = message.content.toLowerCase();
      positiveWords.forEach((word) => {
        if (content.includes(word)) positiveCount++;
      });
      negativeWords.forEach((word) => {
        if (content.includes(word)) negativeCount++;
      });
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    const ua = navigator.userAgent;
    let os: 'Android' | 'iOS' | 'Web' = 'Web';
    let model = 'Unknown';

    if (/android/i.test(ua)) {
      os = 'Android';
      const match = ua.match(/Android\s([0-9.]*)/);
      model = match ? `Android ${match[1]}` : 'Android';
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      os = 'iOS';
      const match = ua.match(/OS (\d+)_(\d+)/);
      model = match ? `iOS ${match[1]}.${match[2]}` : 'iOS';
    }

    return {
      os,
      model,
      userAgent: ua,
    };
  }

  /**
   * Generate unique chat ID
   */
  private generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current chat
   */
  getCurrentChat(): AIChatLog | null {
    return this.currentChat;
  }

  /**
   * Resume a chat from local storage
   */
  async resumeChat(chatId: string): Promise<boolean> {
    try {
      const key = `chat_${chatId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        this.currentChat = JSON.parse(stored);
        this.chatStartTime = new Date(this.currentChat!.createdAt).getTime();
        console.log(`[ChatLogger] Resumed chat: ${chatId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[ChatLogger] Failed to resume chat:', error);
      return false;
    }
  }
}

/**
 * Chat Analytics Class
 * Provides analytics queries for admin panel
 */
export class ChatAnalytics {
  /**
   * Get chat statistics
   */
  async getChatStats(startDate?: Date, endDate?: Date): Promise<{
    totalChats: number;
    activeToday: number;
    avgResponseTime: number;
    failedResponses: number;
    imageQueries: number;
    audioQueries: number;
    successRate: number;
    uniqueUsers: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await fetch(`/api/ai/analytics/stats?${params}`);
      return await response.json();
    } catch (error) {
      console.error('[ChatAnalytics] Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Get top user questions
   */
  async getTopQuestions(limit: number = 10): Promise<Array<{
    question: string;
    count: number;
    category: string;
  }>> {
    try {
      const response = await fetch(`/api/ai/analytics/top-questions?limit=${limit}`);
      return await response.json();
    } catch (error) {
      console.error('[ChatAnalytics] Failed to get top questions:', error);
      throw error;
    }
  }

  /**
   * Get chat logs for admin panel
   */
  async getChatLogs(
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    chats: AIChatLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const response = await fetch(
        `/api/ai/analytics/logs?page=${page}&pageSize=${pageSize}`
      );
      return await response.json();
    } catch (error) {
      console.error('[ChatAnalytics] Failed to get chat logs:', error);
      throw error;
    }
  }

  /**
   * Get chat by ID
   */
  async getChatById(chatId: string): Promise<AIChatLog> {
    try {
      const response = await fetch(`/api/ai/chats/${chatId}`);
      return await response.json();
    } catch (error) {
      console.error('[ChatAnalytics] Failed to get chat:', error);
      throw error;
    }
  }

  /**
   * Get usage over time
   */
  async getUsageOverTime(days: number = 7): Promise<Array<{
    date: string;
    chats: number;
    messages: number;
  }>> {
    try {
      const response = await fetch(`/api/ai/analytics/usage?days=${days}`);
      return await response.json();
    } catch (error) {
      console.error('[ChatAnalytics] Failed to get usage data:', error);
      throw error;
    }
  }
}

/**
 * Create global chat logger instance
 */
export const chatLogger = new ChatLogger();

/**
 * Create global analytics instance
 */
export const chatAnalytics = new ChatAnalytics();
