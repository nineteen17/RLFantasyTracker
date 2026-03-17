import { and, asc, eq, ilike } from "drizzle-orm";
import db from "@database/data-source";
import { casualtyWard } from "@database/schema";

export interface CasualtyWardFilters {
	competition?: number;
	team?: string;
	expectedReturn?: string;
}

export async function findCasualtyWardEntries(filters: CasualtyWardFilters) {
	const conditions = [];

	if (filters.competition) {
		conditions.push(eq(casualtyWard.competitionId, filters.competition));
	}
	if (filters.team) {
		conditions.push(ilike(casualtyWard.teamNickname, filters.team));
	}
	if (filters.expectedReturn) {
		conditions.push(ilike(casualtyWard.expectedReturn, filters.expectedReturn));
	}

	return db
		.select({
			competitionId: casualtyWard.competitionId,
			playerUrl: casualtyWard.playerUrl,
			firstName: casualtyWard.firstName,
			lastName: casualtyWard.lastName,
			teamNickname: casualtyWard.teamNickname,
			injury: casualtyWard.injury,
			expectedReturn: casualtyWard.expectedReturn,
			imageUrl: casualtyWard.imageUrl,
			sourceUpdatedAt: casualtyWard.sourceUpdatedAt,
			updatedAt: casualtyWard.updatedAt,
		})
		.from(casualtyWard)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(
			asc(casualtyWard.teamNickname),
			asc(casualtyWard.lastName),
			asc(casualtyWard.firstName),
		);
}
