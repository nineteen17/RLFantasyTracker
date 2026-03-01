import { users } from "@src/database/schema";
import type { Database } from "@src/database/data-source";
import { inject, injectable } from "tsyringe";
import { and, eq, isNull, or } from "drizzle-orm";
import { AuthDTO, AuthRegisterRequest } from "../auth.types";
import { IAuthRepository } from "./auth.repository.interface";
import { AuthDTOSchema } from "../auth.schema";
import { INJECTION_TOKENS } from "@src/config";

const DEFAULT_COLUMNS = {
	id: true,
	username: true,
	email: true,
	uuid: true,
	createdAt: true,
} as const;

@injectable()
export class DrizzleAuthRepository implements IAuthRepository {
	constructor(
		@inject(INJECTION_TOKENS.DataSource) private db: Database,
	) {}

	async findByUsernameOrEmail(
		username: string,
		email: string,
	): Promise<AuthDTO | null> {
		const user = await this.db.query.users.findFirst({
			columns: DEFAULT_COLUMNS,
			where: or(eq(users.username, username), eq(users.email, email)),
		});
		return user ? AuthDTOSchema().parse(user) : null;
	}

	async findByUsernameWithPassword(
		username: string,
	): Promise<AuthDTO | null> {
		const user = await this.db.query.users.findFirst({
			columns: {
				...DEFAULT_COLUMNS,
				password: true,
			},
			where: and(
				eq(users.username, username),
				eq(users.active, true),
				isNull(users.deletedAt),
			),
		});
		return user ? AuthDTOSchema().parse(user) : null;
	}

	async findByUUID(uuid: string): Promise<AuthDTO | null> {
		const user = await this.db.query.users.findFirst({
			columns: DEFAULT_COLUMNS,
			where: and(
				eq(users.uuid, uuid),
				eq(users.active, true),
				isNull(users.deletedAt),
			),
		});
		return user ? AuthDTOSchema().parse(user) : null;
	}

	async create(auth: AuthRegisterRequest): Promise<AuthDTO> {
		const [user] = await this.db
			.insert(users)
			.values({
				username: auth.username,
				email: auth.email,
				password: auth.password,
			})
			.returning({
				id: users.id,
				username: users.username,
				email: users.email,
				uuid: users.uuid,
				createdAt: users.createdAt,
			});
		return AuthDTOSchema().parse(user);
	}
}
