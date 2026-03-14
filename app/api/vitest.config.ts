/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: [
			"test/unit/shared/**/*.unit.test.ts",
			"test/unit/auth/authUtils.unit.test.ts",
			"test/unit/worker/**/*.unit.test.ts",
		],
		setupFiles: ["test/setup-env.ts"],
	},
	plugins: [tsconfigPaths()],
});
