import { randomUUID } from "node:crypto";
import { JWTPayload } from "@src/logic/shared/types/auth.types";
import { ERRORS } from "@src/logic/shared/utils/errors";
import jwt from "jsonwebtoken";

export const signRefreshToken = (userUUID: string) => {
	const refreshToken = jwt.sign(
		{
			uuid: userUUID,
			tokenUUID: randomUUID(),
			type: "refresh",
		},
		process.env.JWT_REFRESH_SECRET!,
		{
			expiresIn: (process.env.JWT_ACCESS_EXPIRATION ||
				"7d") as jwt.SignOptions["expiresIn"],
		},
	);
	return refreshToken;
};

export const verifyRefreshToken = (
	refreshToken: string,
	ignoreExpiration = false,
): JWTPayload => {
	let jwtPayload: JWTPayload;
	try {
		jwtPayload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, {
			ignoreExpiration,
		}) as JWTPayload;
	} catch (err) {
		if (err instanceof jwt.TokenExpiredError && !ignoreExpiration) {
			throw ERRORS.AUTH.REFRESH_TOKEN_EXPIRED();
		}
		throw ERRORS.AUTH.REFRESH_TOKEN_INVALID();
	}
	return jwtPayload;
};
