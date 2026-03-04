const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const rawQ = await client.query(`select data from upstream_cache where type = 'players' order by fetched_at desc limit 1`);
    const currentData = rawQ.rows[0].data;

    const resFixtures = await client.query(`select round_id, home_squad_id, away_squad_id from fixtures where season = 2025`);
    const roundsToFixtures = {};
    for (const f of resFixtures.rows) {
        const r = f.round_id.toString();
        if (!roundsToFixtures[r]) roundsToFixtures[r] = [];
        roundsToFixtures[r].push(f.home_squad_id);
        roundsToFixtures[r].push(f.away_squad_id);
    }

    const squadNames = {};
    const sRes = await client.query(`select squad_id, name from squads`);
    for (const s of sRes.rows) squadNames[s.squad_id] = s.name;

    const transfers = {};
    let totalAnalyzed = 0;

    for (const p of currentData) {
        const cRes = await client.query(`select last_season_scores from player_current where player_id = $1`, [p.id]);
        if (cRes.rows.length === 0) continue;

        const lastScores = cRes.rows[0].last_season_scores || {};
        const scoreRounds = Object.keys(lastScores);
        if (scoreRounds.length === 0) continue;

        totalAnalyzed++;
        const possibleSquads = {};
        for (const r of scoreRounds) {
            const squadsPlaying = roundsToFixtures[r] || [];
            for (const s of squadsPlaying) {
                possibleSquads[s] = (possibleSquads[s] || 0) + 1;
            }
        }

        let bestSquadId = null;
        let maxOverlap = 0;
        for (const [sq, count] of Object.entries(possibleSquads)) {
            if (count > maxOverlap) { maxOverlap = count; bestSquadId = parseInt(sq); }
        }

        if (bestSquadId && bestSquadId !== p.squad_id) {
            transfers[p.id] = {
                name: `${p.first_name} ${p.last_name}`,
                squad2026: squadNames[p.squad_id],
                squad2025: squadNames[bestSquadId],
                squad2025Id: bestSquadId
            };
        }
    }

    console.log(`Analyzed ${totalAnalyzed} players who played in 2025.`);
    console.log(`Found ${Object.keys(transfers).length} transfers returning different squads in 2025 vs 2026.`);

    let output = `// Auto-generated mapping of player IDs to their 2025 squad IDs for off-season transfers.\n`;
    output += `// Upstream NRL Fantasy API clears original_squad_id to null at the start of a season.\n\n`;
    output += `export const offSeasonTransfers: Record<number, number> = {\n`;
    for (const [id, t] of Object.entries(transfers)) {
        output += `\t${id}: ${t.squad2025Id}, // ${t.name} (${t.squad2025} -> ${t.squad2026})\n`;
    }
    output += `};\n`;
    fs.writeFileSync('app/api/src/worker/syncers/data/off-season-transfers.ts', output);
    console.log('Successfully wrote off-season-transfers.ts!');

    await client.end();
}
run().catch(console.error);
