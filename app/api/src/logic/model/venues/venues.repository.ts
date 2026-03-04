import { asc } from "drizzle-orm";
import db from "@database/data-source";
import { venues } from "@database/schema";

export async function findAllVenues() {
	return db.query.venues.findMany({
		columns: {
			venueId: true,
			name: true,
			shortName: true,
		},
		orderBy: [asc(venues.name)],
	});
}
