import { EncryptionConfig } from './types';
import crypto from 'crypto';

export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: Buffer;

  constructor(config: EncryptionConfig) {
    this.config = config;
    // In production, derive from secure key management service
    this.masterKey = this.deriveMasterKey(process.env.MASTER_KEY || 'development-key');
  }

  private deriveMasterKey(secret: string): Buffer {
    const salt = crypto.randomBytes(this.config.saltLength);
    
    switch (this.config.keyDerivation) {
      case 'PBKDF2':
        return crypto.pbkdf2Sync(
          secret,
          salt,
          this.config.iterations,
          32, // 256 bits
          'sha256'
        );
      
      case 'scrypt':
        return crypto.scryptSync(secret, salt, 32);
      
      default:
        throw new Error(`Unsupported key derivation: ${this.config.keyDerivation}`);
    }
  }

  async encrypt(data: string | Buffer): Promise<{ encrypted: string; iv: string; tag?: string }> {
    const iv = crypto.randomBytes(16);
    
    switch (this.config.algorithm) {
      case 'AES-256-GCM': {
        const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
        
        const encrypted = Buffer.concat([
          cipher.update(data),
          cipher.final()
        ]);
        
        const tag = cipher.getAuthTag();
        
        return {
          encrypted: encrypted.toString('base64'),
          iv: iv.toString('base64'),
          tag: tag.toString('base64')
        };
      }
      
      case 'AES-256-CBC': {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.masterKey, iv);
        
        const encrypted = Buffer.concat([
          cipher.update(data),
          cipher.final()
        ]);
        
        return {
          encrypted: encrypted.toString('base64'),
          iv: iv.toString('base64')
        };
      }
      
      default:
        throw new Error(`Unsupported algorithm: ${this.config.algorithm}`);
    }
  }

  async decrypt(encryptedData: string, iv: string, tag?: string): Promise<Buffer> {
    const ivBuffer = Buffer.from(iv, 'base64');
    const encrypted = Buffer.from(encryptedData, 'base64');
    
    switch (this.config.algorithm) {
      case 'AES-256-GCM': {
        if (!tag) {
          throw new Error('Authentication tag required for GCM mode');
        }
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, ivBuffer);
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        
        return Buffer.concat([
          decipher.update(encrypted),
          decipher.final()
        ]);
      }
      
      case 'AES-256-CBC': {
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.masterKey, ivBuffer);
        
        return Buffer.concat([
          decipher.update(encrypted),
          decipher.final()
        ]);
      }
      
      default:
        throw new Error(`Unsupported algorithm: ${this.config.algorithm}`);
    }
  }

  async encryptField(value: any): Promise<string> {
    const data = JSON.stringify(value);
    const result = await this.encrypt(data);
    
    // Combine all components into a single string
    return [
      result.encrypted,
      result.iv,
      result.tag || ''
    ].join('.');
  }

  async decryptField(encryptedValue: string): Promise<any> {
    const [encrypted, iv, tag] = encryptedValue.split('.');
    
    const decrypted = await this.decrypt(
      encrypted,
      iv,
      tag || undefined
    );
    
    return JSON.parse(decrypted.toString());
  }

  // Hash sensitive data for indexing/searching
  hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  // Generate secure tokens
  generateToken(length: number = 32): string {
    return crypto
      .randomBytes(length)
      .toString('base64url');
  }
}

// Default HIPAA-compliant encryption configuration
export const defaultEncryptionConfig: EncryptionConfig = {
  algorithm: 'AES-256-GCM',
  keyDerivation: 'PBKDF2',
  saltLength: 32,
  iterations: 100000
};

// Singleton instance
export const encryptionService = new EncryptionService(defaultEncryptionConfig);