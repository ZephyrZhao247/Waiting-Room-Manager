// CSV parsing for row-based and column-based formats
import Papa from 'papaparse';
import type { ParsedCSV, CSVParseResult, RoundId } from '../types';
import { normalizeEmail, isValidEmail } from '../utils';

/**
 * Detect CSV format by analyzing headers
 */
function detectCSVFormat(headers: string[]): 'row-based' | 'column-based' | 'unknown' {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  // Row-based: expects "round_id" (or similar) and "email", optionally "registered_name"
  const hasRoundId = normalizedHeaders.some(h => h.includes('round'));
  const hasEmail = normalizedHeaders.some(h => h === 'email' || h.includes('email'));

  if (hasRoundId && hasEmail && normalizedHeaders.length >= 2 && normalizedHeaders.length <= 3) {
    return 'row-based';
  }

  // Column-based: first column is email, optionally registered_name, other columns are round names
  if (hasEmail && normalizedHeaders.length > 1) {
    return 'column-based';
  }

  return 'unknown';
}

/**
 * Parse row-based CSV
 * Format: round_id,email
 */
function parseRowBased(rows: any[]): {
  rounds: Map<RoundId, Set<string>>;
  emailToName: Map<string, string>;
  errors: string[];
  warnings: string[];
} {
  const rounds = new Map<RoundId, Set<string>>();
  const emailToName = new Map<string, string>();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because of 0-index and header row

    // Find round_id, email, and registered_name columns (flexible column names)
    const roundIdKey = Object.keys(row).find(k => k.toLowerCase().includes('round'));
    const emailKey = Object.keys(row).find(k => k.toLowerCase().includes('email'));
    const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name'));

    if (!roundIdKey || !emailKey) {
      errors.push(`Row ${rowNum}: Missing round_id or email column`);
      continue;
    }

    const roundId = String(row[roundIdKey]).trim();
    const email = String(row[emailKey]).trim();
    const registeredName = nameKey ? String(row[nameKey]).trim() : '';

    if (!roundId) {
      warnings.push(`Row ${rowNum}: Empty round_id, skipping`);
      continue;
    }

    if (!email) {
      warnings.push(`Row ${rowNum}: Empty email, skipping`);
      continue;
    }

    if (!isValidEmail(email)) {
      warnings.push(`Row ${rowNum}: Invalid email format "${email}", skipping`);
      continue;
    }

    const normalizedEmail = normalizeEmail(email);

    // Store registered name if provided
    if (registeredName && !emailToName.has(normalizedEmail)) {
      emailToName.set(normalizedEmail, registeredName);
    }

    if (!rounds.has(roundId)) {
      rounds.set(roundId, new Set());
    }
    rounds.get(roundId)!.add(normalizedEmail);
  }

  return { rounds, emailToName, errors, warnings };
}

/**
 * Parse column-based CSV
 * Format: email,round_1,round_2,round_3,...
 * Values: 1 = conflict, 0 = no conflict
 */
function parseColumnBased(rows: any[], headers: string[]): {
  rounds: Map<RoundId, Set<string>>;
  emailToName: Map<string, string>;
  errors: string[];
  warnings: string[];
} {
  const rounds = new Map<RoundId, Set<string>>();
  const emailToName = new Map<string, string>();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Find email and registered_name columns
  const emailKey = headers.find(h => h.toLowerCase().includes('email'));
  if (!emailKey) {
    errors.push('Could not find email column');
    return { rounds, emailToName, errors, warnings };
  }

  const nameKey = headers.find(h => h.toLowerCase().includes('name'));

  // Other columns are round IDs (exclude email and registered_name)
  const roundColumns = headers.filter(h => h !== emailKey && h !== nameKey);

  if (roundColumns.length === 0) {
    errors.push('No round columns found');
    return { rounds, emailToName, errors, warnings };
  }

  // Initialize rounds
  for (const roundCol of roundColumns) {
    rounds.set(roundCol, new Set());
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const email = String(row[emailKey]).trim();
    const registeredName = nameKey ? String(row[nameKey]).trim() : '';

    if (!email) {
      warnings.push(`Row ${rowNum}: Empty email, skipping`);
      continue;
    }

    if (!isValidEmail(email)) {
      warnings.push(`Row ${rowNum}: Invalid email format "${email}", skipping`);
      continue;
    }

    const normalizedEmail = normalizeEmail(email);

    // Store registered name if provided
    if (registeredName) {
      emailToName.set(normalizedEmail, registeredName);
    }

    // Check each round column
    for (const roundCol of roundColumns) {
      const value = String(row[roundCol]).trim();

      // Conflict if value is "1", "true", "yes", or any truthy value
      const isConflict = value === '1' || 
                        value.toLowerCase() === 'true' || 
                        value.toLowerCase() === 'yes' ||
                        value.toLowerCase() === 'x';

      if (isConflict) {
        rounds.get(roundCol)!.add(normalizedEmail);
      }
    }
  }

  return { rounds, emailToName, errors, warnings };
}

/**
 * Parse CSV file
 */
export function parseCSV(csvContent: string): CSVParseResult {
  return new Promise((resolve) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for parsing errors
        if (results.errors.length > 0) {
          results.errors.forEach(err => {
            errors.push(`Parse error: ${err.message} at row ${err.row}`);
          });
        }

        if (results.data.length === 0) {
          resolve({
            success: false,
            errors: ['CSV file is empty or has no valid data'],
            warnings: [],
            stats: { totalRows: 0, roundsFound: 0, uniqueEmails: 0 },
          });
          return;
        }

        const headers = results.meta.fields || [];
        const format = detectCSVFormat(headers);

        if (format === 'unknown') {
          resolve({
            success: false,
            errors: ['Could not determine CSV format. Expected either row-based (round_id,email) or column-based (email,round_1,round_2,...)'],
            warnings: [],
            stats: { totalRows: results.data.length, roundsFound: 0, uniqueEmails: 0 },
          });
          return;
        }

        let rounds: Map<RoundId, Set<string>>;
        let emailToName: Map<string, string>;
        let parseErrors: string[];
        let parseWarnings: string[];

        if (format === 'row-based') {
          const result = parseRowBased(results.data);
          rounds = result.rounds;
          emailToName = result.emailToName;
          parseErrors = result.errors;
          parseWarnings = result.warnings;
        } else {
          const result = parseColumnBased(results.data, headers);
          rounds = result.rounds;
          emailToName = result.emailToName;
          parseErrors = result.errors;
          parseWarnings = result.warnings;
        }

        errors.push(...parseErrors);
        warnings.push(...parseWarnings);

        // Calculate stats
        const uniqueEmails = new Set<string>();
        rounds.forEach(emails => {
          emails.forEach(email => uniqueEmails.add(email));
        });

        const stats = {
          totalRows: results.data.length,
          roundsFound: rounds.size,
          uniqueEmails: uniqueEmails.size,
        };

        if (rounds.size === 0) {
          resolve({
            success: false,
            errors: ['No valid rounds found in CSV'],
            warnings,
            stats,
          });
          return;
        }

        resolve({
          success: true,
          data: {
            format,
            rounds,
            emailToName,
          },
          errors,
          warnings,
          stats,
        });
      },
    });
  });
}

/**
 * Export sample CSV templates
 */
export const sampleRowBasedCSV = `round_id,email
1,alice@example.com
1,bob@example.com
2,carol@example.com
2,alice@example.com
3,dave@example.com`;

export const sampleColumnBasedCSV = `email,round_1,round_2,round_3
alice@example.com,1,0,1
bob@example.com,1,1,0
carol@example.com,0,1,0
dave@example.com,0,0,1`;
