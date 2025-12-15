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

        // Get entry packages and competition info
        const pkgUrl = `https://api.prod.platform.mwapp.io/sweepstake/${compid}`;
        const pkgRes = await axios.get(pkgUrl, { headers });
        const pkgData = pkgRes.data;
        const competitionName = pkgData?.name || '';
        const prizes = pkgData?.prizes || [];
        const prizeCount = prizes.length;
        const isMultiPrize = prizeCount > 1;

        const packages = (pkgData?.entryPackages || [])
            .map(p => ({
                entries: Number(p.entryCount) || 0,
                price: Number(p.price) || 0
            }))
            .sort((a, b) => a.price - b.price);

        const yourEntries = Number(entries) || 0;
        const overallEntries = total + yourEntries;
        const currentOdds = overallEntries > 0 ? yourEntries / overallEntries : 0;

        // Calculate "any place" odds for multi-prize competitions
        const currentAnyPlaceOdds = isMultiPrize && overallEntries > 0 && yourEntries > 0
            ? 1 - Math.pow(1 - yourEntries / overallEntries, prizeCount)
            : currentOdds;

        const rows = packages.map(pkg => {
            const newYour = yourEntries + pkg.entries;
            const newTotal = total + yourEntries + pkg.entries;

            // Top prize odds (standard calculation)
            const topPrizeProb = newTotal > 0 ? newYour / newTotal : 0;
            const topPrizeOneIn = topPrizeProb > 0 ? parseFloat((1 / topPrizeProb).toFixed(2)) : Infinity;

            // Any place odds (for multi-prize competitions)
            // Formula: P(at least one win) = 1 - (1 - m/N)^K
            const anyPlaceProb = isMultiPrize && newTotal > 0
                ? 1 - Math.pow(1 - newYour / newTotal, prizeCount)
                : topPrizeProb;
            const anyPlaceOneIn = anyPlaceProb > 0 ? parseFloat((1 / anyPlaceProb).toFixed(2)) : Infinity;

            const costBasedOnOdds = topPrizeOneIn !== Infinity ? topPrizeOneIn * pkg.price : Infinity;

            return {
                entries: pkg.entries,
                price: pkg.price,
                probability: topPrizeProb,
                oneIn: topPrizeOneIn,
                costBasedOnOdds: costBasedOnOdds,
                // Additional fields for multi-prize
                anyPlaceProb: anyPlaceProb,
                anyPlaceOneIn: anyPlaceOneIn
            };
        });

        res.json({
            compId: compid,
            compName: competitionName,
            othersEntries: total,
            yourEntries: yourEntries,
            overallEntries: overallEntries,
            currentOdds: currentOdds,
            currentAnyPlaceOdds: currentAnyPlaceOdds,
            prizeCount: prizeCount,
            isMultiPrize: isMultiPrize,
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