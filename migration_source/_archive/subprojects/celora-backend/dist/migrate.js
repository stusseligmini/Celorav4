"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function handler() {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');
        await prisma.$disconnect();
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Database connection successful'
            })
        };
    }
    catch (error) {
        console.error('Database connection failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Database connection failed',
                error: error.message
            })
        };
    }
}
//# sourceMappingURL=migrate.js.map