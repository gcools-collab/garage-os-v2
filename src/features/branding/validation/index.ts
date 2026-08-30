export {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE,
  MAX_LOGO_DIMENSION,
  MIN_LOGO_DIMENSION,
  getLogoExtension,
  hasValidLogoSignature,
  isAllowedLogoMimeType,
  readLogoDimensions,
  validateLogoDimensions,
  validateLogoFile,
} from "./logo-validation"
export type { AllowedLogoMimeType, ImageDimensions } from "./logo-validation"
