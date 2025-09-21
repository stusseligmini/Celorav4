exports.handler = async (event, context) => {
    console.log('Lambda invoked with event:', JSON.stringify(event, null, 2));
    
    try {
        const response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify({
                message: 'Celora Backend API - Ultra Simple Version',
                timestamp: new Date().toISOString(),
                event: event.requestContext || 'No request context',
                path: event.path || event.rawPath || 'unknown',
                method: event.httpMethod || event.requestContext?.http?.method || 'unknown',
                environment: {
                    NODE_ENV: process.env.NODE_ENV,
                    hasDatabase: !!process.env.DATABASE_URL,
                    hasJWT: !!process.env.JWT_SECRET
                }
            })
        };
        
        console.log('Returning response:', JSON.stringify(response, null, 2));
        return response;
        
    } catch (error) {
        console.error('Error in handler:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error.message,
                stack: error.stack
            })
        };
    }
};
