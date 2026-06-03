"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");

const PORT = Number(process.env.SWAGGER_PORT || 4003);
const specPath = path.join(__dirname, "openapi.yml");
const spec = YAML.parse(fs.readFileSync(specPath, "utf8"));

const app = express();

app.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: "FMCG-Binary API",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  })
);

app.listen(PORT, () => {
  console.log(`Swagger UI: http://localhost:${PORT}/`);
});
