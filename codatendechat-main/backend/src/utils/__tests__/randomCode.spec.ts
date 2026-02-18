import { randomString } from '../randomCode';

describe('randomString', () => {
    it('should generate a string of the specified length', () => {
        const length = 10;
        const result = randomString(length);
        expect(result).toHaveLength(length);
    });

    it('should generate a string with default character set', () => {
        const length = 100;
        const defaultCharSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const result = randomString(length);
        for (const char of result) {
            expect(defaultCharSet).toContain(char);
        }
    });

    it('should generate a string with a custom character set', () => {
        const length = 10;
        const customCharSet = 'ABC';
        const result = randomString(length, customCharSet);
        expect(result).toHaveLength(length);
        for (const char of result) {
            expect(customCharSet).toContain(char);
        }
    });

    it('should handle length of 0', () => {
        const result = randomString(0);
        expect(result).toBe('');
    });

    it('should handle large length', () => {
        const length = 1000;
        const result = randomString(length);
        expect(result).toHaveLength(length);
    });
});
