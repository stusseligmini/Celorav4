export interface EncryptedPayload {
    ciphertext: string;
    iv: string;
    tag?: string;
    version: number;
}
export declare function encryptString(plain: string, keyMaterial: string): Promise<EncryptedPayload>;
export declare function decryptString(payload: EncryptedPayload, keyMaterial: string): Promise<string>;
