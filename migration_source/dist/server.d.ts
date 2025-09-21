import { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
declare const app: Application;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const prisma: PrismaClient<{
    log: ("error" | "query")[];
}, "error" | "query", import("@prisma/client/runtime/library").DefaultArgs>;
export { app, io };
//# sourceMappingURL=server.d.ts.map