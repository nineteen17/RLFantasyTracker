// Mapping of player IDs to their 2025 squad IDs for off-season transfers.
// The NRL Fantasy API sets original_squad_id = 0 for off-season moves,
// so we maintain this static map as a fallback for the first season of data.
// Once auto-detection in the syncer has run across a season boundary,
// this map is only needed as an initial seed for new/reset databases.
//
// Squad IDs:
//   500001 Roosters   500002 Sea Eagles  500003 Knights    500004 Titans
//   500005 Rabbitohs  500010 Bulldogs    500011 Broncos    500012 Cowboys
//   500013 Raiders    500014 Panthers    500021 Storm      500022 Dragons
//   500023 Tigers     500028 Sharks      500031 Eels       500032 Warriors
//   500723 Dolphins

export const offSeasonTransfers: Record<number, number> = {
	// → Broncos
	507987: 500021, // Grant Anderson (from Storm)
	508071: 500723, // Aublix Tawha (from Dolphins)

	// → Bulldogs
	100007572: 500003, // Leo Thompson (from Knights)
	509561: 500028, // Kade Dykes (from Sharks)
	504842: 500723, // Sean O'Sullivan (from Dolphins)

	// → Cowboys
	502756: 500014, // Soni Luke (from Panthers)
	505460: 500010, // Reed Mahoney (from Bulldogs)

	// → Dolphins
	100004649: 500011, // Selwyn Cobbo (from Broncos)
	100002660: 500014, // Brad Schneider (from Panthers)

	// → Dragons
	100004700: 500028, // Daniel Atkinson (from Sharks)
	100015592: 500014, // David Fale (from Panthers)
	510696: 500032, // Setu Tu (from Warriors)
	503533: 500723, // Josh Kerr (from Dolphins)

	// → Eels
	500872: 500004, // Brian Kelly (from Titans)
	500619: 500022, // Jack de Belin (from Dragons)
	509524: 500021, // Jonah Pezet (from Storm)
	501351: 500010, // Josh Addo-Carr (from Bulldogs)

	// → Knights
	509579: 500001, // Sandon Smith (from Roosters)
	505626: 500031, // Dylan Brown (from Eels)
	507915: 500013, // Trey Mooney (from Raiders)
	504079: 500013, // Pasami Saulo (from Raiders)
	506220: 500723, // Harrison Graham (from Dolphins)

	// → Panthers
	502695: 500003, // Jack Cogger (from Knights)
	509843: 500032, // Tom Ale (from Warriors)
	504144: 500032, // Kalani Going (from Warriors)
	504830: 500032, // Freddy Lussick (from Warriors)

	// → Rabbitohs
	500128: 500003, // Adam Elliott (from Knights)
	500168: 500021, // Bronson Garlick (from Storm)
	506482: 500004, // David Fifita (from Titans)
	100007790: 500022, // Jonah Glover (from Dragons)
	510488: 500032, // Moala Graham-Taufa (from Warriors)

	// → Raiders
	502016: 500003, // Jayden Brailey (from Knights)
	100004188: 500022, // Sione Finau (from Dragons)
	507645: 500014, // Daine Laurie (from Panthers)
	100011844: 500011, // Coby Black (from Broncos)

	// → Roosters
	500024: 500002, // Daly Cherry-Evans (from Sea Eagles)
	503944: 500012, // Reece Robson (from Cowboys)
	505642: 500002, // Tommy Talau (from Sea Eagles)
	509404: 500022, // Cody Ramsey (from Dragons)

	// → Sea Eagles
	506567: 500011, // Kobe Hetherington (from Broncos)
	501175: 500013, // Jamal Fogarty (from Raiders)

	// → Storm
	508341: 500014, // Trent Toelau (from Panthers)
	509560: 500013, // Manaia Waitere (from Raiders)
	509444: 500005, // Davvy Moale (from Rabbitohs)
	503336: 500003, // Jack Hetherington (from Knights)

	// → Tigers
	505701: 500011, // Jock Madden (from Broncos)
	100008107: 500003, // Kai Pearce-Paul (from Knights)
	507814: 500014, // Mavrik Geyer (from Panthers)

	// → Titans
	507924: 500723, // Max Feagai (from Dolphins)
	505633: 500014, // Luke Sommerton (from Panthers)
	505564: 500022, // Lachlan Ilias (from Dragons)
	505648: 500010, // Kurtis Morrin (from Bulldogs)

	// → Warriors
	100001619: 500004, // Alofiana Khan-Pereira (from Titans)
	100011247: 500003, // Jye Linnane (from Knights)
	100009103: 500005, // Haizyn Mellars (from Rabbitohs)
};
