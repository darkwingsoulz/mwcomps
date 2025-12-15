# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Node.js/Express web application that calculates MetaWin competition odds. It serves a single-page application that allows users to input a competition ID and their current entry count, then calculates winning probabilities based on real-time participant data from the MetaWin API.

## Development Commands
- Start the server: `npm start` (runs `node server.js`)
- No build process is needed - this is a vanilla HTML/CSS/JS frontend
- Server runs on port 3000 by default (configurable via PORT environment variable)

## Architecture
The application consists of three main components:

### Backend (server.js)
- Express.js server that serves static files from `/public`
- Single API endpoint: `/api/calculate`
- Fetches participant data from MetaWin's production API (api.prod.platform.mwapp.io)
- Calculates odds based on total entries and entry packages
- Uses pagination to collect all participant data

### Frontend (public/index.html)
- Self-contained HTML file with embedded CSS and JavaScript
- Dark theme styled to match MetaWin branding
- Responsive design with mobile optimizations
- Real-time API integration for odds calculation

### API Integration
- Makes authenticated requests to MetaWin API with Origin header
- Handles two main endpoints:
  - `/sweepstake/{compid}/participant` - gets participant entry counts
  - `/sweepstake/{compid}` - gets entry package information
- Implements pagination for participant data collection

## Key Features
- URL parameter support for direct competition links (compid and entries)
- Real-time odds calculation with multiple entry package options
- Responsive statistics display showing current and potential odds
- Error handling for invalid competition IDs and API failures

## Dependencies
- express: Web server framework
- axios: HTTP client for API requests
- fs: File system operations (unused but listed in package.json)