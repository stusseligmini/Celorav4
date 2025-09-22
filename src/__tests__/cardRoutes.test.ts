import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { PATCH } from '@celora/web/src/app/api/cards/[id]/status/route';
import { GET } from '@celora/web/src/app/api/cards/[id]/risk/route';

// Mock dependencies
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    }
  }))
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(() => ({ value: 'test-cookie' }))
  }))
}));

vi.mock('@celora/infrastructure', () => ({
  SupabaseService: vi.fn().mockImplementation(() => ({
    updateCardStatus: vi.fn(),
    getCardRiskScore: vi.fn()
  }))
}));

describe('Card API Routes', () => {
  const mockUser = { id: 'user-123' };
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn()
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  describe('PATCH /api/cards/[id]/status', () => {
    it('should update card status successfully', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock service response
      const mockUpdateCardStatus = vi.fn().mockResolvedValue(true);
      const { SupabaseService } = await import('@celora/infrastructure');
      (SupabaseService as any).mockImplementation(() => ({
        updateCardStatus: mockUpdateCardStatus
      }));

      const request = new NextRequest('http://localhost/api/cards/card-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' })
      });

      const context = {
        params: Promise.resolve({ id: 'card-123' })
      };

      const response = await PATCH(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cardId).toBe('card-123');
      expect(data.status).toBe('suspended');
      expect(mockUpdateCardStatus).toHaveBeenCalledWith('card-123', 'user-123', 'suspended');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const request = new NextRequest('http://localhost/api/cards/card-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' })
      });

      const context = {
        params: Promise.resolve({ id: 'card-123' })
      };

      const response = await PATCH(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid status', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const request = new NextRequest('http://localhost/api/cards/card-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid' })
      });

      const context = {
        params: Promise.resolve({ id: 'card-123' })
      };

      const response = await PATCH(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid status. Must be "active" or "suspended"');
    });
  });

  describe('GET /api/cards/[id]/risk', () => {
    it('should return risk score successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const mockGetCardRiskScore = vi.fn().mockResolvedValue(0.45);
      const { SupabaseService } = await import('@celora/infrastructure');
      (SupabaseService as any).mockImplementation(() => ({
        getCardRiskScore: mockGetCardRiskScore
      }));

      const request = new NextRequest('http://localhost/api/cards/card-123/risk');
      const context = {
        params: Promise.resolve({ id: 'card-123' })
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cardId).toBe('card-123');
      expect(data.riskScore).toBe(0.45);
      expect(data.riskLevel).toBe('medium');
      expect(data.timestamp).toBeDefined();
      expect(mockGetCardRiskScore).toHaveBeenCalledWith('card-123', 'user-123');
    });

    it('should return low risk level for score < 0.3', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const mockGetCardRiskScore = vi.fn().mockResolvedValue(0.2);
      const { SupabaseService } = await import('@celora/infrastructure');
      (SupabaseService as any).mockImplementation(() => ({
        getCardRiskScore: mockGetCardRiskScore
      }));

      const request = new NextRequest('http://localhost/api/cards/card-123/risk');
      const context = {
        params: Promise.resolve({ id: 'card-123' })
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.riskLevel).toBe('low');
    });

    it('should return high risk level for score >= 0.6', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const mockGetCardRiskScore = vi.fn().mockResolvedValue(0.75);
      const { SupabaseService } = await import('@celora/infrastructure');
      (SupabaseService as any).mockImplementation(() => ({
        getCardRiskScore: mockGetCardRiskScore
      }));

      const request = new NextRequest('http://localhost/api/cards/card-123/risk');
      const context = {
        params: Promise.resolve({ id: 'card-123' })
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.riskLevel).toBe('high');
    });
  });
});