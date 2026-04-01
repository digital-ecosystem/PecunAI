import { prisma } from '@/lib/prisma';

export interface AISettings {
  id: string;
  prompt: string;
  firstMessage: string;
  model: string;
  vectorId: string | null;
  productId: string | null;
  isActive: boolean;
}

export interface MainProductPrompt {
  id: string;
  vectorId: string | null;
  aiModel: string;
  mcpUrl: string | null;
  mainPrompt: string;
}

export async function getMainProductPrompt(): Promise<MainProductPrompt | null> {
  try {
    const mainPrompt = await prisma.mainProductPrompt.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    return mainPrompt;
  } catch (error) {
    console.error('Error fetching main product prompt:', error);
    return null;
  }
}

export async function getProductAISettings(productId: string): Promise<AISettings | null> {
  try {
    const aiSettings = await prisma.aISettings.findFirst({
      where: {
        productId,
        isActive: true
      }
    });
    return aiSettings;
  } catch (error) {
    console.error('Error fetching product AI settings:', error);
    return null;
  }
}

export async function getSessionProductId(sessionId: string): Promise<string | null> {
  try {
    const suggestion = await prisma.sessionProductSuggestion.findUnique({
      where: { qaSessionId: sessionId }
    });
    return suggestion?.productId || null;
  } catch (error) {
    console.error('Error fetching session product ID:', error);
    return null;
  }
}

// Predefined welcome messages for each product
export const PRODUCT_WELCOME_MESSAGES: Record<string, string> = {
  'KONSERVATIV_bond': 'Willkommen! Ich bin hier, um Ihnen bei Ihren konservativen Anlagemöglichkeiten zu helfen. Lassen Sie uns über sichere Investitionen sprechen, die zu Ihrem Risikoprofil passen.',
  'balanced_portfolio': 'Hallo! Als Ihr Berater für ausgewogene Portfolios kann ich Ihnen helfen, eine perfekte Balance zwischen Sicherheit und Wachstumspotenzial zu finden.',
  'growth_investment': 'Willkommen! Ich freue mich, mit Ihnen über gewinnorientierte Investmentmöglichkeiten zu sprechen. Lassen Sie uns Ihre Wachstumsziele erkunden.',
  'default': 'Willkommen! Ich bin Ihr persönlicher Finanzberater und helfe Ihnen gerne bei all Ihren Fragen zu dem vorgeschlagenen Produkt.'
};

export function getWelcomeMessage(productName: string | null): string {
  if (!productName) return PRODUCT_WELCOME_MESSAGES.default;

  // Normalize product name to find matching message
  const normalizedName = productName.toLowerCase().replace(/[^a-z]/g, '_');

  // Try to find exact match or partial match
  for (const [key, message] of Object.entries(PRODUCT_WELCOME_MESSAGES)) {
    if (key === normalizedName || normalizedName.includes(key)) {
      return message;
    }
  }

  return PRODUCT_WELCOME_MESSAGES.default;
}