# Ladang — Farm Visiting PWA

Work in progress. This repository is intended for a friendly English, Bahasa Malaysia and Simplified Chinese farm notebook. No signatures, land documents or manual report submission.

## Local development

Use Node.js 20.19 or newer. Run `npm install`, then `npm run dev`. Run `npm run build` for the GitHub Pages output in `dist/`.

## Hosting and services

GitHub Pages serves only the public application code. Farmer records, phone numbers, photographs and precise coordinates must never be committed to GitHub. Shared organisation records require a separately configured authenticated backend with organisation and team access policies. Environment variables in `.env.example` are public browser configuration; never put service-role keys in them.

## Planned delivery checks

- Offline application loading and IndexedDB record persistence.
- Farm and visit editing, recoverable Trash and explicit permanent deletion.
- Backup validation and restore, including photographs.
- Excel reporting with embedded photographs.
- Supervisor staff/date filters and distinct visit/farm counts.
- Esri map attribution and honest map-unavailable state offline.
- English, Malay and Chinese interface; server translation of free text.
- Automatic sync without a manual submission workflow.

Scheduled notifications while the PWA is closed require a push service and server scheduler. Browser timers alone are not reliable for this requirement.
