import { OpenAPIRegistry, RouteConfig } from "@asteasolutions/zod-to-openapi";
import { ErrorMessage } from "@src/logic/shared/utils/errors/errorMessages";

type RequestSchemaMap = Partial<
	Record<"body" | "query" | "params" | "cookies", unknown>
>;

const isOpenApiSchema = (schema: unknown): schema is { openapi: Function } =>
	typeof (schema as { openapi?: unknown } | undefined)?.openapi === "function";

export interface OpenAPIRoute {
	method:
		| "get"
		| "post"
		| "put"
		| "delete"
		| "patch"
		| "head"
		| "options"
		| "trace";
	path: string;
	summary?: string;
	tags?: string[];
	request?: RequestSchemaMap;
	successResponse?: { status: number; schema?: unknown };
	errorResponses: ErrorMessage[];
}

export const registerRoute = (
	registry: OpenAPIRegistry,
	route: OpenAPIRoute,
): void => {
	const {
		method,
		path,
		summary,
		tags,
		request,
		errorResponses: errors,
		successResponse: success,
	} = route;

	const successMessage = success
		? {
				[success.status]: {
					description: isOpenApiSchema(success.schema) ? "" : "No Content",
					content: isOpenApiSchema(success.schema)
						? {
								"application/json": { schema: success.schema },
							}
						: undefined,
				},
			}
		: {};

	registry.registerPath({
		method: method,
		path: path,
		summary: summary,
		tags: tags,
		...getRequestConfig(request),
		responses: {
			...getErrorResponses(errors),
			...successMessage,
		},
	});
};

const getRequestConfig = (schemaMap?: RequestSchemaMap) => {
	if (!schemaMap) return {};

	const request: RouteConfig["request"] = {};

	if (isOpenApiSchema(schemaMap.body)) {
		request.body = {
			required: true,
			content: {
				"application/json": {
					schema: schemaMap.body as any,
				},
			},
		};
	}

	if (isOpenApiSchema(schemaMap.query)) {
		request.query = schemaMap.query as NonNullable<RouteConfig["request"]>["query"];
	}

	if (isOpenApiSchema(schemaMap.params)) {
		request.params = schemaMap.params as NonNullable<RouteConfig["request"]>["params"];
	}

	return { request };
};

const getErrorResponses = (
	errorResponses: ErrorMessage[],
): NonNullable<RouteConfig["responses"]> => {
	const resposnes = errorResponses.reduce(
		(acc, res) => {
			acc[res.status] = {
				description: res.message,
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								title: {
									type: "string",
									example: res.title,
								},
								message: {
									type: "string",
									example: res.message,
								},
							},
							required: ["title", "message"],
						},
					},
				},
			};
			return acc;
		},
		{} as NonNullable<RouteConfig["responses"]>,
	);

	return resposnes;
};
