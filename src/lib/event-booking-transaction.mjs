const RETRYABLE_CODES = new Set(["P2034", "40001", "40P01"]);

export function isRetryableBookingTransactionError(error) {
  return [error?.code, error?.meta?.code, error?.cause?.code].some((code) => RETRYABLE_CODES.has(code));
}

const defaultWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runWithBookingTransactionRetry(work, {
  maxAttempts = 3,
  wait = defaultWait,
  random = Math.random,
} = {}) {
  const attemptsLimit = Math.max(1, Math.min(5, Number(maxAttempts) || 3));
  for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= attemptsLimit || !isRetryableBookingTransactionError(error)) throw error;
      const base = Math.min(250, 25 * (2 ** (attempt - 1)));
      const jitter = Math.floor(Math.max(0, Math.min(1, random())) * 25);
      await wait(base + jitter);
    }
  }
  throw new Error("Unreachable booking transaction retry state");
}
