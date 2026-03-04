const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("Fetching all players...");
  const playersRes = await client.query(`
    select p.player_id, p.full_name, p.squad_id, c.last_season_scores, c.career_avg_vs, p.original_squad_id
    from players p
    join player_current c on p.player_id = c.player_id
  `);
  
  const squadsRes = await client.query(`select squad_id, name from squads`);
  const squads = {};
  for (const s of squadsRes.rows) squads[s.squad_id] = s.name;

  let transferMap = {};
  
  for (const p of playersRes.rows) {
    // If they have no 2025 scores, they didn't play NRL last year (rookies, SL transfers)
    const lastScores = p.last_season_scores || {};
    const roundsPlayed = Object.keys(lastScores).length;
    
    // If they didn't play last year, skip
    if (roundsPlayed === 0) continue;
    
    // Let's hypothesize: if a player has a 2025 score, but they have NEVER played AGAINST their 2026 club in their entire career,
    // they probably played FOR their 2026 club in 2025 (i.e. they didn't transfer).
    // Or conversely, if we have a way to know they changed clubs.
    
    // Actually, NRL Fantasy API `career_avg_vs` tracks averages against specific squads.
    // If they played in 2025, and their current club is NOT in their `career_avg_vs` list, 
    // it means they've never played against their current club. Which strongly implies they've always been at their current club.
    // If their current club IS in their `career_avg_vs` list, it means they used to play for someone else and played against their current club!
    
    const careerVs = p.career_avg_vs || {};
    const playedAgainstCurrentClub = careerVs[p.squad_id] !== undefined;
    
    if (playedAgainstCurrentClub) {
        // They are an off-season transfer! (Or mid-season, but those are rare and original_squad_id might be caught).
        
        // Let's find out which club they came from. 
        // We can't know definitively from career_avg_vs alone, because they might have played for 3 different clubs.
        // But we can filter down to squads they have NOT played against.
        
        const neverPlayedAgainst = Object.keys(squads).filter(sId => sId !== p.squad_id.toString() && careerVs[sId] === undefined);
        
        transferMap[p.player_id] = {
            name: p.full_name,
            currentSquad: squads[p.squad_id],
            possibleOldSquads: neverPlayedAgainst.map(id => squads[id]).join(', ')
        };
    }
  }

  console.log(`Found ${Object.keys(transferMap).length} potential transfers based on career_avg_vs heuristic.`);
  console.log(JSON.stringify(Object.values(transferMap).slice(0, 5), null, 2));

  await client.end();
}
run().catch(console.error);
