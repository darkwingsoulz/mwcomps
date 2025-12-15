// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (your HTML page)
app.use(express.static('public'));

// API endpoint to get recent competitions
app.get('/api/competitions', async (req, res) => {
    try {
        const headers = { 'Origin': 'https://metawin.com' };
        const url = 'https://api.prod.platform.mwapp.io/sweepstake?includeRecent=30';
        const response = await axios.get(url, { headers });
        const competitions = response.data.map(comp => ({
            id: comp.id,
            name: comp.name
        }));
        res.json(competitions);
    } catch (err) {
        console.error('Error fetching competitions:', err.message);
        res.status(500).json({ error: 'Failed to fetch competitions' });
    }
});

// API endpoint that does the calculation
app.get('/api/calculate', async (req, res) => {
    const { compid, entries = '0' } = req.query;

    if (!compid) {
        return res.status(400).json({ error: 'Missing compid parameter' });
    }

    try {
        const headers = { 'Origin': 'https://metawin.com' };
        const pageSize = 10;

        // Get total entries from participants
        let total = 0;
        let page = 1;
        let pageCount = 1;

        while (page <= pageCount) {
            const url = `https://api.prod.platform.mwapp.io/sweepstake/${compid}/participant?pageSize=${pageSize}&page=${page}`;
            const response = await axios.get(url, { headers });
            const data = response.data;

            if (data?.items?.length) {
                for (const item of data.items) {
                    total += Number(item.entryCount) || 0;
                }
            }
            pageCount = data.pageCount || pageCount;
            page++;
        }

        // Get entry packages
        const pkgUrl = `https://api.prod.platform.mwapp.io/sweepstake/${compid}`;
        const pkgRes = await axios.get(pkgUrl, { headers });
        const pkgData = pkgRes.data;
        const packages = (pkgData?.entryPackages || [])
            .map(p => ({
                entries: Number(p.entryCount) || 0,
                price: Number(p.price) || 0
            }))
            .sort((a, b) => a.price - b.price);

        const yourEntries = Number(entries) || 0;
        const overallEntries = total + yourEntries;
        const currentOdds = overallEntries > 0 ? yourEntries / overallEntries : 0;

        const rows = packages.map(pkg => {
            const newYour = yourEntries + pkg.entries;
            const newTotal = total + yourEntries + pkg.entries;
            const prob = newTotal > 0 ? newYour / newTotal : 0;
            const oneIn = prob > 0 ? Math.round(1 / prob) : Infinity;
            const costBasedOnOdds = oneIn !== Infinity ? oneIn * pkg.price : Infinity;

            return {
                entries: pkg.entries,
                price: pkg.price,
                probability: prob,
                oneIn: oneIn,
                costBasedOnOdds: costBasedOnOdds
            };
        });

        res.json({
            compId: compid,
            othersEntries: total,
            yourEntries: yourEntries,
            overallEntries: overallEntries,
            currentOdds: currentOdds,
            packages: rows
        });

    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message || 'Failed to fetch data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});