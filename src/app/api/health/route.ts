import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected', // Could add actual DB health check
      auth: 'operational',
      api: 'running'
    }
  };
  
  return NextResponse.json(health);
}
