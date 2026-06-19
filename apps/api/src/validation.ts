import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validate(schema: z.ZodSchema<any>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((issue: z.ZodIssue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
        return;
      }
      res.status(400).json({ error: 'Invalid request body' });
    }
  };
}

export const RegisterUserSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50, 'Display name must not exceed 50 characters'),
  postal_code: z.string().optional().or(z.literal('')),
  archetype: z.object({
    housing: z.enum(['apartment', 'townhouse', 'family', 'default']).optional(),
    diet: z.enum(['vegan', 'vegetarian', 'balanced', 'meat', 'default']).optional(),
    commute: z.enum(['transit', 'ev', 'hybrid', 'gas', 'default']).optional()
  }).optional()
});

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name must not exceed 50 characters').optional(),
  postalCode: z.string().optional().or(z.literal('')),
  archetype: z.object({
    housing: z.enum(['apartment', 'townhouse', 'family', 'default']).optional(),
    diet: z.enum(['vegan', 'vegetarian', 'balanced', 'meat', 'default']).optional(),
    commute: z.enum(['transit', 'ev', 'hybrid', 'gas', 'default']).optional()
  }).optional()
});

export const CreateEventSchema = z.object({
  category: z.enum(['housing', 'transport', 'food']),
  source_provider: z.string().optional(),
  raw_value: z.number().nonnegative('Value must be a positive number or zero'),
  raw_unit: z.string().min(1, 'Unit is required'),
  region_code: z.string().optional(),
  transportMode: z.enum(['transit', 'ev', 'hybrid', 'suv', 'gas_car', 'default']).optional(),
  dietType: z.enum(['vegan', 'vegetarian', 'balanced', 'meat']).optional(),
  housingOption: z.enum(['standard', 'smart_nest', 'solar']).optional()
});

export const ChallengeProgressSchema = z.object({
  challengeType: z.string().min(1, 'Challenge type is required'),
  dayIndex: z.number().int().min(0).max(6, 'Day index must be between 0 and 6'),
  completed: z.boolean()
});

export const RedeemVoucherSchema = z.object({
  sponsorName: z.string().min(1, 'Sponsor name is required'),
  rewardType: z.enum(['tree', 'discount', 'plug']),
  costLeaves: z.number().int().positive('Leaves cost must be greater than zero')
});

export const ArcadiaCallbackSchema = z.object({
  authCode: z.string().min(1, 'Auth code is required')
});
