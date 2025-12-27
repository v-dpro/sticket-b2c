import { AxiosError } from 'axios';

/**
 * Extracts a user-friendly error message from an API error
 */
export function getErrorMessage(error: unknown): string {
  // Network errors (no response)
  if (error instanceof Error && !(error as AxiosError).response) {
    if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return 'Network error. Please check your connection and try again.';
  }

  // Axios errors with response
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  if (axiosError.response) {
    const status = axiosError.response.status;
    const data = axiosError.response.data;

    // User-friendly messages based on status code
    switch (status) {
      case 400:
        return data?.error || data?.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Please sign in to continue.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return data?.error || data?.message || 'This resource already exists.';
      case 422:
        return data?.error || data?.message || 'Validation error. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server error. Please try again later.';
      default:
        return data?.error || data?.message || `Error ${status}. Please try again.`;
    }
  }

  // Generic error
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Checks if an error is a network error (no internet connection)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network error') ||
      message.includes('econnrefused') ||
      message.includes('timeout') ||
      (!(error as AxiosError).response && message.includes('network'))
    );
  }
  return false;
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const axiosError = error as AxiosError;
  return axiosError.response?.status === 401;
}

