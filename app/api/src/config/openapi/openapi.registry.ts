import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registerRoute } from "@src/config/openapi/openapi.helper";
import {
  AUTH_OPENAPI_ROUTES,
  AUTH_OPENAPI_SCHEMAS,
} from "@src/logic/model/auth/auth.openapi";
import {
  TEAMS_OPENAPI_ROUTES,
  TEAMS_OPENAPI_SCHEMAS,
} from "@src/logic/model/teams/teams.openapi";
import {
  PLAYERS_OPENAPI_ROUTES,
  PLAYERS_OPENAPI_SCHEMAS,
} from "@src/logic/model/players/players.openapi";
import {
  CASUALTY_OPENAPI_ROUTES,
  CASUALTY_OPENAPI_SCHEMAS,
} from "@src/logic/model/casualty/casualty.openapi";

const registry = new OpenAPIRegistry();

// Schemas defined in [feature].schema.ts
const schemas = {
  ...AUTH_OPENAPI_SCHEMAS,
  ...TEAMS_OPENAPI_SCHEMAS,
  ...PLAYERS_OPENAPI_SCHEMAS,
  ...CASUALTY_OPENAPI_SCHEMAS,
};

// Routes defined in [feature].routes.ts
const routes = {
  ...AUTH_OPENAPI_ROUTES,
  ...TEAMS_OPENAPI_ROUTES,
  ...PLAYERS_OPENAPI_ROUTES,
  ...CASUALTY_OPENAPI_ROUTES,
};

// ====================
// OpenAPI Registration
// ====================

Object.entries(schemas).forEach(([key, schema]) => {
  if (typeof schema.openapi === "function") {
    registry.register(key, schema.openapi(key));
  }
});

Object.values(routes).forEach((route) => {
  registerRoute(registry, route);
});

export default registry;
