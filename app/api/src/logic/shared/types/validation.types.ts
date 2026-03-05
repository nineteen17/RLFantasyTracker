export type RequestPart = "body" | "query" | "params" | "cookies";

type ValidationIssue = {
	path: Array<string | number>;
	message: string;
};

type ValidationResult =
	| { success: true; data: unknown }
	| { success: false; error: { errors: ValidationIssue[] } };

export type ValidationSchema = {
	strip: () => {
		safeParse: (value: unknown) => ValidationResult;
	};
};

export type SchemaMap = Partial<Record<RequestPart, ValidationSchema>>;
