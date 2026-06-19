import { Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma, seedUserChallenges, seedWeeklyLeague } from '../database.js';
import { 
  computeHousingCO2, 
  computeTransportCO2, 
  computeFoodCO2, 
  computeArchetypeBaseline,
  GRID_FACTORS
} from '@footprint/carbon-math';
import { AuthenticatedRequest, JWT_SECRET } from '../auth.js';
import { getGridCarbonFactor } from '../services/electricityMaps.js';
import { generateUserInsights } from '../services/insights.js';
import { calculateLevel } from '../utils.js';

// 1. POST /api/users - Onboarding Archetype Selection (Open endpoint)
export async function registerUser(req: any, res: Response): Promise<void> {
  try {
    const { display_name, postal_code, archetype } = req.body;
    if (!display_name) {
      res.status(400).json({ error: 'Display name is required' });
      return;
    }

    const userId = crypto.randomUUID();
    const baseline = computeArchetypeBaseline(archetype || {
      housing: 'townhouse',
      diet: 'balanced',
      commute: 'hybrid'
    });

    // Save user
    await prisma.user.create({
      data: {
        id: userId,
        displayName: display_name,
        currentLevel: 1,
        totalLeaves: 0,
        postalCode: postal_code || ''
      }
    });

    // Seed challenges
    await seedUserChallenges(userId);

    // Seed weekly Eco-Leagues leaderboard
    await seedWeeklyLeague(userId);

    // Get live grid factor for user postal code
    const gridFactor = await getGridCarbonFactor(postal_code || '');
    const customRegionKey = `custom-${postal_code || ''}`;
    GRID_FACTORS[customRegionKey] = gridFactor;

    // Seed historical baseline events for the last 6 months (to display rich charts)
    const now = new Date();
    const eventDataList = [];
    for (let i = 5; i >= 0; i--) {
      const eventDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const timestamp = eventDate;

      // Seed housing event (monthly)
      const housingKWh = archetype?.housing === 'apartment' ? 300 : archetype?.housing === 'family' ? 1000 : 6000/12;
      const housingCO2 = computeHousingCO2(housingKWh, 'standard', customRegionKey);
      eventDataList.push({
        id: crypto.randomUUID(),
        userId,
        category: 'housing',
        sourceProvider: 'manual',
        rawValue: housingKWh,
        rawUnit: 'kWh',
        computedCo2eKg: housingCO2,
        regionCode: customRegionKey,
        timestamp
      });

      // Seed transport event (monthly)
      const transportMiles = archetype?.commute === 'transit' ? 100 : archetype?.commute === 'gas' ? 1200 : 600;
      const transportMode = archetype?.commute === 'transit' ? 'transit' : archetype?.commute === 'gas' ? 'suv' : 'hybrid';
      const transportCO2 = computeTransportCO2(transportMiles, transportMode as any);
      eventDataList.push({
        id: crypto.randomUUID(),
        userId,
        category: 'transport',
        sourceProvider: 'manual',
        rawValue: transportMiles,
        rawUnit: 'miles',
        computedCo2eKg: transportCO2,
        timestamp
      });

      // Seed food event (monthly)
      const foodMeals = 90; // ~3 meals a day
      const foodDiet = archetype?.diet || 'balanced';
      const foodCO2 = computeFoodCO2(foodMeals, foodDiet);
      eventDataList.push({
        id: crypto.randomUUID(),
        userId,
        category: 'food',
        sourceProvider: 'manual',
        rawValue: foodMeals,
        rawUnit: 'meals',
        computedCo2eKg: foodCO2,
        timestamp
      });
    }

    await prisma.carbonEvent.createMany({
      data: eventDataList
    });

    const createdUser = await prisma.user.findUnique({ where: { id: userId } });
    if (createdUser) {
      // Sign JWT token
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

      // Set JWT token in an HTTP-only secure cookie
      res.cookie('footprint_auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        user: {
          id: createdUser.id,
          display_name: createdUser.displayName,
          current_level: createdUser.currentLevel,
          total_leaves: createdUser.totalLeaves,
          postal_code: createdUser.postalCode,
          created_at: createdUser.createdAt.toISOString()
        },
        token,
        baseline
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve created user' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 2. GET /api/users/:id - Fetch user details (Secured)
export async function getUserDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (req.userId !== req.params.id) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      id: user.id,
      display_name: user.displayName,
      current_level: user.currentLevel,
      total_leaves: user.totalLeaves,
      postal_code: user.postalCode,
      created_at: user.createdAt.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 2b. PATCH /api/users/:id - Update user details & archetype (Secured)
export async function updateUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (req.userId !== req.params.id) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    const { displayName, postalCode, archetype } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: any = {};
    if (displayName) {
      updateData.displayName = displayName;
    }
    if (postalCode !== undefined) {
      updateData.postalCode = postalCode;
    }

    // Perform database user update if needed
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      // If displayName changed, update username in the league
      if (displayName) {
        await prisma.league.updateMany({
          where: { userId },
          data: { username: displayName }
        });
      }
    }

    let baseline = null;

    if (archetype) {
      // Recalculate new baseline
      baseline = computeArchetypeBaseline(archetype);

      // Re-calculate regional grid factor if postal code is changing, or use current user's postal code
      const currentPostalCode = postalCode !== undefined ? postalCode : (user.postalCode || '');
      const gridFactor = await getGridCarbonFactor(currentPostalCode);
      const customRegionKey = `custom-${currentPostalCode}`;
      GRID_FACTORS[customRegionKey] = gridFactor;

      // Delete old manual events to re-seed with the new archetype
      await prisma.carbonEvent.deleteMany({
        where: {
          userId,
          sourceProvider: 'manual'
        }
      });

      // Seed new baseline events for the last 6 months
      const now = new Date();
      const eventDataList = [];
      for (let i = 5; i >= 0; i--) {
        const eventDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
        const timestamp = eventDate;

        // Seed housing event (monthly)
        const housingKWh = archetype.housing === 'apartment' ? 300 : archetype.housing === 'family' ? 1000 : 500;
        const housingCO2 = computeHousingCO2(housingKWh, 'standard', customRegionKey);
        eventDataList.push({
          id: crypto.randomUUID(),
          userId,
          category: 'housing',
          sourceProvider: 'manual',
          rawValue: housingKWh,
          rawUnit: 'kWh',
          computedCo2eKg: housingCO2,
          regionCode: customRegionKey,
          timestamp
        });

        // Seed transport event (monthly)
        const transportMiles = archetype.commute === 'transit' ? 100 : archetype.commute === 'gas' ? 1200 : 600;
        const transportMode = archetype.commute === 'transit' ? 'transit' : archetype.commute === 'gas' ? 'suv' : 'hybrid';
        const transportCO2 = computeTransportCO2(transportMiles, transportMode as any);
        eventDataList.push({
          id: crypto.randomUUID(),
          userId,
          category: 'transport',
          sourceProvider: 'manual',
          rawValue: transportMiles,
          rawUnit: 'miles',
          computedCo2eKg: transportCO2,
          timestamp
        });

        // Seed food event (monthly)
        const foodMeals = 90; // ~3 meals a day
        const foodDiet = archetype.diet || 'balanced';
        const foodCO2 = computeFoodCO2(foodMeals, foodDiet);
        eventDataList.push({
          id: crypto.randomUUID(),
          userId,
          category: 'food',
          sourceProvider: 'manual',
          rawValue: foodMeals,
          rawUnit: 'meals',
          computedCo2eKg: foodCO2,
          timestamp
        });
      }

      await prisma.carbonEvent.createMany({
        data: eventDataList
      });
    }

    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    res.json({
      user: updatedUser ? {
        id: updatedUser.id,
        display_name: updatedUser.displayName,
        current_level: updatedUser.currentLevel,
        total_leaves: updatedUser.totalLeaves,
        postal_code: updatedUser.postalCode,
        created_at: updatedUser.createdAt.toISOString()
      } : null,
      baseline
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 2c. GET /api/users/:id/insights - Fetch personalized carbon insights & recommendations (Secured)
export async function getUserInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (req.userId !== req.params.id) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    const insightsData = await generateUserInsights(req.params.id);
    res.json(insightsData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 2d. POST /api/auth/logout - Clear user authentication cookie (Open/Secured)
export async function logoutUser(req: any, res: Response): Promise<void> {
  res.clearCookie('footprint_auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ status: 'success', message: 'Logged out successfully' });
}
