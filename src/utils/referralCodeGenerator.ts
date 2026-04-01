import { prisma } from "@/lib/prisma";
import crypto from "crypto";


/**
 * Generates a unique referral code for partners
 * Format: PREFIX-XXXX-XXXX (e.g., PART-A3B9-K7M2)
 * 
 * @param prefix - Optional prefix for the code (default: "PART")
 * @param length - Length of each segment (default: 4)
 * @returns A unique referral code
 */
export async function generateUniqueReferralCode(
  prefix: string = "PART",
  length: number = 4
): Promise<string> {
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const code = generateReferralCode(prefix, length);
    
    // Check if code already exists in database
    const existingPartner = await prisma.partner.findUnique({
      where: { referralCode: code },
    });

    if (!existingPartner) {
      return code;
    }

    attempts++;
  }

  // If we couldn't generate a unique code after max attempts, use a timestamp-based approach
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generates a referral code without checking database uniqueness
 * Format: PREFIX-XXXX-XXXX
 * 
 * @param prefix - Prefix for the code
 * @param length - Length of each segment
 * @returns A referral code string
 */
function generateReferralCode(prefix: string, length: number): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding ambiguous chars (0, O, I, 1)
  
  const segment1 = generateRandomSegment(characters, length);
  const segment2 = generateRandomSegment(characters, length);
  
  return `${prefix}-${segment1}-${segment2}`;
}

/**
 * Generates a random segment of characters
 * 
 * @param characters - Character set to use
 * @param length - Length of the segment
 * @returns Random string segment
 */
function generateRandomSegment(characters: string, length: number): string {
  let result = "";
  const bytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += characters[bytes[i] % characters.length];
  }
  
  return result;
}

/**
 * Generates a simple numeric referral code
 * Format: PREFIX-NNNNNN (e.g., PART-123456)
 * 
 * @param prefix - Optional prefix for the code (default: "PART")
 * @returns A unique numeric referral code
 */
export async function generateNumericReferralCode(
  prefix: string = "PART"
): Promise<string> {
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const number = Math.floor(100000 + Math.random() * 900000); // 6-digit number
    const code = `${prefix}-${number}`;
    
    const existingPartner = await prisma.partner.findUnique({
      where: { referralCode: code },
    });

    if (!existingPartner) {
      return code;
    }

    attempts++;
  }

  // Fallback with timestamp
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
}

/**
 * Generates a referral code based on partner's name
 * Format: FIRSTNAME-XXXX (e.g., JOHN-A3B9)
 * 
 * @param firstName - Partner's first name
 * @param lastName - Partner's last name (optional)
 * @returns A unique referral code based on name
 */
export async function generateNameBasedReferralCode(
  firstName: string,
  lastName?: string
): Promise<string> {
  const maxAttempts = 10;
  let attempts = 0;
  
  // Clean and format the name
  const namePrefix = firstName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6);

  while (attempts < maxAttempts) {
    const randomSuffix = generateRandomSegment(
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
      4
    );
    const code = `${namePrefix}-${randomSuffix}`;
    
    const existingPartner = await prisma.partner.findUnique({
      where: { referralCode: code },
    });

    if (!existingPartner) {
      return code;
    }

    attempts++;
  }

  // Fallback: add last name initial or random chars
  const lastNameInitial = lastName ? lastName[0].toUpperCase() : "";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
  return `${namePrefix}-${lastNameInitial}${timestamp}`;
}

/**
 * Validates if a referral code is available
 * 
 * @param code - The referral code to check
 * @returns True if available, false if already in use
 */
export async function isReferralCodeAvailable(code: string): Promise<boolean> {
  const existingPartner = await prisma.partner.findUnique({
    where: { referralCode: code },
  });
  
  return !existingPartner;
}

/**
 * Generates a custom referral code with validation
 * Useful when you want to specify your own code format
 * 
 * @param customCode - The custom code to validate and use
 * @returns The custom code if available
 * @throws Error if code is already in use
 */
export async function useCustomReferralCode(customCode: string): Promise<string> {
  const normalized = customCode.toUpperCase().trim();
  
  const isAvailable = await isReferralCodeAvailable(normalized);
  
  if (!isAvailable) {
    throw new Error(`Referral code "${normalized}" is already in use`);
  }
  
  return normalized;
}
