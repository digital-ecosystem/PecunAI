/**
 * In-memory IP-based throttling store (simple, local implementation)
 * For production, consider using Redis or a dedicated rate-limiting service.
 * 
 * Structure: Map<ip, { attempts: number, firstAttemptTime: number, blockedUntil?: number }>
 */
const ipThrottleMap = new Map<string, { attempts: number; firstAttemptTime: number; blockedUntil?: number }>()

interface IPThrottleConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

const DEFAULT_CONFIG: IPThrottleConfig = {
  maxAttempts: parseInt(process.env.IP_THROTTLE_MAX_ATTEMPTS || '10', 10),
  windowMs: parseInt(process.env.IP_THROTTLE_WINDOW_MS || '60000', 10), // 1 minute
  blockDurationMs: parseInt(process.env.IP_THROTTLE_BLOCK_MS || '900000', 10), // 15 minutes
}

/**
 * Check if an IP is rate-limited for OTP requests.
 * Returns { allowed: boolean, remainingAttempts?: number, blockedUntil?: Date }
 */
export function checkIPThrottle(ip: string, config: IPThrottleConfig = DEFAULT_CONFIG): {
  allowed: boolean
  remainingAttempts?: number
  blockedUntil?: Date
} {
  const now = Date.now()
  const record = ipThrottleMap.get(ip)

  // If no record, allow the attempt
  if (!record) {
    ipThrottleMap.set(ip, { attempts: 1, firstAttemptTime: now })
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 }
  }

  // If still blocked, return blocked status
  if (record.blockedUntil && now < record.blockedUntil) {
    return {
      allowed: false,
      blockedUntil: new Date(record.blockedUntil),
    }
  }

  // If block has expired, reset
  if (record.blockedUntil && now >= record.blockedUntil) {
    record.attempts = 0
    record.blockedUntil = undefined
  }

  // Check if window has expired
  if (now - record.firstAttemptTime > config.windowMs) {
    // Window expired, reset counter
    record.attempts = 1
    record.firstAttemptTime = now
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 }
  }

  // Within window
  record.attempts += 1

  if (record.attempts > config.maxAttempts) {
    // Block this IP
    record.blockedUntil = now + config.blockDurationMs
    return {
      allowed: false,
      blockedUntil: new Date(record.blockedUntil),
    }
  }

  return { allowed: true, remainingAttempts: config.maxAttempts - record.attempts }
}

/**
 * Cleanup function to prevent memory leaks.
 * Call periodically to remove old entries from throttle map.
 */
export function cleanupIPThrottle(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now()
  const entriesToDelete: string[] = []

  ipThrottleMap.forEach((record, ip) => {
    const age = now - record.firstAttemptTime
    if (age > maxAgeMs) {
      entriesToDelete.push(ip)
    }
  })

  entriesToDelete.forEach(ip => ipThrottleMap.delete(ip))
}

/**
 * Get current throttle status for an IP (debug/admin use)
 */
export function getIPThrottleStatus(ip: string): { attempts: number; firstAttemptTime: number; blockedUntil?: number } | null {
  return ipThrottleMap.get(ip) || null
}

/**
 * Reset throttle for an IP (admin use)
 */
export function resetIPThrottle(ip: string): void {
  ipThrottleMap.delete(ip)
}

/**
 * Get total throttled IPs count (debug/monitoring use)
 */
export function getThrottledIPCount(): number {
  return ipThrottleMap.size
}
