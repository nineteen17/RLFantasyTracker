export function intToBool(value: number): boolean {
	return value === 1;
}

export function deriveSeason(isoDate: string): number {
	const parsed = new Date(isoDate);
	if (Number.isNaN(parsed.getTime())) {
		return new Date().getFullYear();
	}
	return parsed.getFullYear();
}

export function toNumericStr(
	value: number | undefined | null,
): string | null {
	if (value === undefined || value === null) return null;
	return String(value);
}
