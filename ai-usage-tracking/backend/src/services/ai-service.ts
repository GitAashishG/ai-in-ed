import { AzureOpenAI } from 'openai';
import { ConversationMessage } from '../types';

const SYSTEM_PROMPT = `YOU ARE A HELPFUL ASSISTANT WORKING AS A COMPUTER SCIENCE TUTOR. 
RESPOND TO CODING AND COMPUTER SCIENCE RELATED QUESTIONS AND POLITELY DECLINE NON-CODING AND NON-PROGRAMMING QUESTIONS. 
YOUR NAME IS USU-AI-TUTOR. IF USER ASKS ABOUT THE USAGE OF THIS TOOL, TELL THEM THIS IS PART OF A RESEARCH PROJECT AND THEIR DATA IS PRIVATE AND PROTECTED. 
BE CONCISE, ACCURATE, AND TO THE POINT.`;

export class AIService {
  private client: AzureOpenAI;
  private model: string;
  private deploymentName: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    this.model = process.env.AZURE_OPENAI_MODEL || 'gpt-4.1';
    this.deploymentName = this.model; // In Azure OpenAI, the deployment name is often the model name

    if (!endpoint || !apiKey) {
      throw new Error('Azure OpenAI credentials not configured');
    }

    this.client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
      deployment: this.deploymentName
    });

    console.log('✅ Azure OpenAI service initialized');
    console.log(`   Model/Deployment: ${this.deploymentName}`);
    console.log(`   Endpoint: ${endpoint}`);
  }

  async generateResponse(
    conversationHistory: ConversationMessage[]
  ): Promise<{ response: string; tokenCount?: number }> {
    try {
      const messages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...conversationHistory
      ];

      const result = await this.client.chat.completions.create({
        model: '',  // Empty string is required for Azure OpenAI
        messages,
        max_tokens: 3000,
        temperature: 0.7
      });

      const response = result.choices[0]?.message?.content || 'No response generated';
      const tokenCount = result.usage?.total_tokens;

      return { response, tokenCount };
    } catch (error) {
      console.error('Error calling Azure OpenAI:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  getModel(): string {
    return this.model;
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
