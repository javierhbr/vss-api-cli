// Generated Zod schema DTOs for payments2 handler
import { z } from 'zod';

/**
 * Request DTO schema for payments2
 */
export const Payments2RequestDto = z.object({
  // TODO: Define your request schema properties here
  // Example:
  // id: z.string().uuid(),
  // name: z.string().min(1).max(100),
});

export type Payments2RequestDtoType = z.infer<typeof Payments2RequestDto>;

/**
 * Response DTO schema for payments2
 */
export const Payments2ResponseDto = z.object({
  // TODO: Define your response schema properties here
  // Example:
  // id: z.string().uuid(),
  // name: z.string(),
  // createdAt: z.string().datetime(),
});

export type Payments2ResponseDtoType = z.infer<typeof Payments2ResponseDto>;
