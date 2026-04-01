import { NextResponse } from 'next/server';
import { logger } from './logger';

export class AppError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    logger.error(error.message, { statusCode: error.statusCode, code: error.code });
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    logger.error(error.message, { stack: error.stack });
    return NextResponse.json(
      { success: false, error: error.message }, // In prod, might want to hide internal error details
      { status: 500 }
    );
  }

  logger.error('Unknown error occurred', { error });
  return NextResponse.json(
    { success: false, error: 'An unexpected error occurred' },
    { status: 500 }
  );
}
