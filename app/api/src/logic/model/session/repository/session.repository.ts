import { users, userSessions } from "@src/database/schema";
import type { Database } from "@src/database/data-source";
import { inject, injectable } from "tsyringe";
import { and, eq, isNull } from "drizzle-orm";
import { INJECTION_TOKENS } from "@src/config";
import { UserSessionDTO, UserSessionRequest } from "../session.types";
import { ISessionRepository } from "./session.repository.interface";

@injectable()
export class DrizzleSessionRepository implements ISessionRepository {
	constructor(
		@inject(INJECTION_TOKENS.DataSource) private db: Database,
	) {}

	async create(sessionRequest: UserSessionRequest): Promise<UserSessionDTO> {
		const { userUUID, userAgent, ipAddress, refreshToken } = sessionRequest;

		const user = await this.db.query.users.findFirst({
			where: eq(users.uuid, userUUID),
		});
		if (!user) {
			throw new Error("User not found");
		}

		const [session] = await this.db
			.insert(userSessions)
			.values({
				userId: user.id,
				refreshToken,
				userAgent: userAgent ?? null,
				ipAddress: ipAddress ?? null,
			})
			.returning();

		return {
			id: session.id,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt ?? undefined,
			deletedAt: session.deletedAt ?? undefined,
			refreshToken: session.refreshToken,
			userAgent: session.userAgent,
			ipAddress: session.ipAddress,
			user: {
				uuid: user.uuid,
				username: user.username,
				email: user.email,
				createdAt: user.uuid,
			},
		};
	}

	async findByToken(refreshToken: string): Promise<UserSessionDTO | null> {
		const session = await this.db.query.userSessions.findFirst({
			where: and(
				eq(userSessions.refreshToken, refreshToken),
				isNull(userSessions.deletedAt),
			),
			with: { user: true },
		});

		if (!session) return null;

		return {
			id: session.id,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt ?? undefined,
			deletedAt: session.deletedAt ?? undefined,
			refreshToken: session.refreshToken,
			userAgent: session.userAgent,
			ipAddress: session.ipAddress,
			user: {
				uuid: session.user.uuid,
				username: session.user.username,
				email: session.user.email,
				createdAt: session.user.uuid,
			},
		};
	}

	async delete(refreshToken: string): Promise<void> {
		await this.db
			.update(userSessions)
			.set({ deletedAt: new Date() })
			.where(eq(userSessions.refreshToken, refreshToken));
	}

	async deleteAllForUser(userUUID: string): Promise<void> {
		const user = await this.db.query.users.findFirst({
			where: eq(users.uuid, userUUID),
		});
		if (!user) return;

		await this.db
			.update(userSessions)
			.set({ deletedAt: new Date() })
			.where(
				and(
					eq(userSessions.userId, user.id),
					isNull(userSessions.deletedAt),
				),
			);
	}

	async getActiveSessions(userUUID: string): Promise<UserSessionDTO[]> {
		const user = await this.db.query.users.findFirst({
			where: eq(users.uuid, userUUID),
		});
		if (!user) return [];

		const sessions = await this.db.query.userSessions.findMany({
			where: and(
				eq(userSessions.userId, user.id),
				isNull(userSessions.deletedAt),
			),
			with: { user: true },
		});

		return sessions.map((session) => ({
			id: session.id,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt ?? undefined,
			deletedAt: session.deletedAt ?? undefined,
			refreshToken: session.refreshToken,
			userAgent: session.userAgent,
			ipAddress: session.ipAddress,
			user: {
				uuid: session.user.uuid,
				username: session.user.username,
				email: session.user.email,
				createdAt: session.user.uuid,
			},
		}));
	}

	async updateRefreshToken(
		oldToken: string,
		newToken: string,
	): Promise<void> {
		await this.db
			.update(userSessions)
			.set({ refreshToken: newToken })
			.where(eq(userSessions.refreshToken, oldToken));
	}
}
