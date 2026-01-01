import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
    
    // Database
    database: {
        url: process.env.DATABASE_URL || '',
        type: process.env.DATABASE_TYPE || 'postgresql'
    },
    
    // Sui Network
    sui: {
        network: process.env.SUI_NETWORK || 'testnet',
        rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
        packageId: process.env.PACKAGE_ID || '',
        eventRegistryId: process.env.EVENT_REGISTRY_ID || ''
    },
    
    // Walrus
    walrus: {
        aggregatorUrl: process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
        publisherUrl: process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',
        epochs: parseInt(process.env.WALRUS_EPOCHS || '5')
    },
    
    // Redis (Optional)
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        enabled: process.env.REDIS_ENABLED === 'true'
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    },
    
    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173']
    }
};

// Validation
export function validateConfig(): void {
    const required = [
        'DATABASE_URL',
        'PACKAGE_ID',
        'EVENT_REGISTRY_ID'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
        console.warn('Please check your .env file');
    }
}
