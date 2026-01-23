import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { handleError } from '../helpers/routing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registerRouter = express.Router();
const conflictsRouter = express.Router();

const USERS_CSV = path.join(__dirname, '../../data/users.csv');
const REGISTRANTS_CSV = path.join(__dirname, '../../data/registrants.csv');
const PCCONFLICTS_CSV = path.join(__dirname, '../../data/pcconflicts.csv');
const MEETING_CONFLICTS_CSV = path.join(__dirname, '../../data/meeting_conflicts.csv');

/**
 * Read and parse CSV file
 */
async function readCSV(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return parse(content, {
            columns: true,
            skip_empty_lines: true,
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

/**
 * Write data to CSV file
 */
async function writeCSV(filePath, records, columns) {
    const content = stringify(records, {
        header: true,
        columns: columns,
    });
    await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * GET /register - Show registration page
 */
registerRouter.get('/', async (req, res, next) => {
    try {
        const users = await readCSV(USERS_CSV);

        res.render('register', {
            title: 'Register for Meeting',
            users: users,
        });
    } catch (e) {
        next(handleError(e));
    }
});

/**
 * POST /register - Handle registration submission
 */
registerRouter.post('/', async (req, res, next) => {
    try {
        const { given_name, family_name, email, zoom_email, zoom_email_confirm } = req.body;

        // Validate inputs
        if (!given_name || !family_name || !email || !zoom_email || !zoom_email_confirm) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required',
            });
        }

        if (zoom_email !== zoom_email_confirm) {
            return res.status(400).json({
                success: false,
                error: 'Zoom email addresses do not match',
            });
        }

        // Read existing registrants
        let registrants = await readCSV(REGISTRANTS_CSV);

        // Check if user already registered (by email)
        const existingIndex = registrants.findIndex((r) => r.email === email);

        const newRecord = {
            given_name,
            family_name,
            email,
            zoom_email,
        };

        if (existingIndex >= 0) {
            // Update existing registration
            registrants[existingIndex] = newRecord;
        } else {
            // Add new registration
            registrants.push(newRecord);
        }

        // Write back to CSV
        await writeCSV(REGISTRANTS_CSV, registrants, [
            'given_name',
            'family_name',
            'email',
            'zoom_email',
        ]);

        res.json({
            success: true,
            message: 'Registration successful!',
            isUpdate: existingIndex >= 0,
        });
    } catch (e) {
        next(handleError(e));
    }
});

/**
 * GET /getconflicts - Generate and download meeting conflicts CSV
 */
conflictsRouter.get('/', async (req, res, next) => {
    try {
        // Read the CSV files
        const pcConflicts = await readCSV(PCCONFLICTS_CSV);
        const registrants = await readCSV(REGISTRANTS_CSV);

        if (pcConflicts.length === 0) {
            return res.status(404).json({
                error: 'PC conflicts file not found or empty',
            });
        }

        // Create a map of email -> zoom_email from registrants
        const emailToZoomEmail = new Map();
        registrants.forEach((r) => {
            if (r.email && r.zoom_email) {
                emailToZoomEmail.set(r.email, r.zoom_email);
            }
        });

        // Process conflicts and replace emails with zoom emails
        const meetingConflicts = pcConflicts.map((conflict) => {
            const zoomEmail = emailToZoomEmail.get(conflict.email);
            return {
                ...conflict,
                email: zoomEmail || conflict.email, // Use zoom_email if available, otherwise keep original
            };
        });

        // Write the result to meeting_conflicts.csv
        const columns = Object.keys(pcConflicts[0]);
        await writeCSV(MEETING_CONFLICTS_CSV, meetingConflicts, columns);

        // Send file as download
        res.download(MEETING_CONFLICTS_CSV, 'meeting_conflicts.csv', (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                if (!res.headersSent) {
                    next(handleError(err));
                }
            }
        });
    } catch (e) {
        next(handleError(e));
    }
});

export { registerRouter, conflictsRouter };
