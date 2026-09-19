import { buildApp } from "./app.js";
import { env } from "./env.js";

const app = await buildApp();

app
  .listen({ port: env.PORT, host: "0.0.0.0" })
  .then((address) => {
    app.log.info(`S2 Nova backend listening at ${address}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
