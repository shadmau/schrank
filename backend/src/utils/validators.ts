export interface ValidationResult {
    isValid: boolean;
    message?: string;
  }
  
  export function validatePriceDataParams(collectionAddress: any, timeframe: any, from: any, to: any): ValidationResult {
    if (!collectionAddress || typeof collectionAddress !== 'string') {
      return { isValid: false, message: 'Invalid or missing "symbol" parameter' };
    }
  
    if (!timeframe || typeof timeframe !== 'string') {
      return { isValid: false, message: 'Invalid or missing "timeframe" parameter' };
    }
  
    const validTimeframes = ['1h', '4h', '1d'];
    if (!validTimeframes.includes(timeframe)) {
      return { isValid: false, message: `Invalid "timeframe". Supported values are: ${validTimeframes.join(', ')}` };
    }
  
    const fromNum = parseInt(from);
    const toNum = parseInt(to);
  
    if (isNaN(fromNum) || isNaN(toNum)) {
      return { isValid: false, message: '"from" and "to" must be valid Unix timestamps' };
    }
  
    if (fromNum >= toNum) {
      return { isValid: false, message: '"from" must be less than "to"' };
    }
  
    return { isValid: true };
  }