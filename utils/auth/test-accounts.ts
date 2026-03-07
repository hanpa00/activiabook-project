import fs from 'fs';
import path from 'path';

export interface TestAccount {
    email: string;
    firstName?: string;
    lastName?: string;
    [key: string]: any;
}

export function isTestModeEnabled(): boolean {
    return process.env.USE_TEST_ACCOUNTS === 'true';
}

export function getTestAccounts(): TestAccount[] {
    const filePath = process.env.USE_TEST_ACCOUNTS_FILE;
    if (!filePath) {
        console.warn('USE_TEST_ACCOUNTS_FILE is not defined in .env');
        return [];
    }

    try {
        // Resolve path relative to project root if it's not absolute
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(process.cwd(), filePath);

        if (!fs.existsSync(absolutePath)) {
            console.error(`Test accounts file not found at: ${absolutePath}`);
            return [];
        }

        const fileContent = fs.readFileSync(absolutePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading test accounts file:', error);
        return [];
    }
}

export function getTestAccount(email: string): TestAccount | undefined {
    const accounts = getTestAccounts();
    const normalizedEmail = email.toLowerCase().trim();
    return accounts.find(acc => acc.email.toLowerCase().trim() === normalizedEmail);
}

export function validateProfileData(email: string, profileData: Record<string, any>): { valid: boolean; message?: string } {
    const account = getTestAccount(email);
    if (!account) {
        return { valid: false, message: 'Thank you for your interest in ActiviaBook, sign-up is currently open to Beta testers only.' };
    }

    // List of fields to validate if they exist in the JSON entry
    const fieldsToValidate = ['firstName', 'lastName'];

    for (const field of fieldsToValidate) {
        if (Object.prototype.hasOwnProperty.call(account, field)) {
            const expectedValue = account[field] || '';
            const actualValue = profileData[field] || '';

            if (expectedValue.toString().toLowerCase().trim() !== actualValue.toString().toLowerCase().trim()) {
                // Map camelCase to friendly names for error messages
                const friendlyName = field === 'firstName' ? 'First Name' : 'Last Name';
                return {
                    valid: false,
                    message: `Provided ${friendlyName} does not match the test account record.`
                };
            }
        }
    }

    return { valid: true };
}
