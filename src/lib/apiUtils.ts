'use client';

/**
 * Fetches a URL with automatic retry logic
 * 
 * @param url The URL to fetch
 * @param options Request options
 * @param retries Number of retries (default: 3)
 * @param backoff Initial backoff in ms, doubles with each retry (default: 300)
 * @returns Response object
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retries: number = 3, 
  backoff: number = 300
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return response;
  } catch (err) {
    if (retries <= 1) throw err;
    
    // Wait before retrying with exponential backoff
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    // Recursively retry with one fewer retry and doubled backoff
    console.log(`Retrying fetch to ${url}. ${retries-1} retries remaining.`);
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
}

/**
 * Converts a fetch result to JSON with error handling
 * 
 * @param response Fetch response
 * @returns JSON result
 */
export async function safeJsonResponse(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch (err) {
    console.error('Error parsing JSON response:', err);
    throw new Error('Invalid JSON response');
  }
}

/**
 * Complete fetch function with retry logic and JSON parsing
 * 
 * @param url The URL to fetch
 * @param options Request options
 * @returns JSON result
 */
export async function fetchJsonWithRetry(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetchWithRetry(url, options);
  return safeJsonResponse(response);
}