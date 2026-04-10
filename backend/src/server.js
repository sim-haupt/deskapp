const app = require("./app");
const { env } = require("./env");
const logger = require("./logger");

app.listen(env.port, env.host, () => {
  logger.info("Backend listening", {
    host: env.host,
    port: env.port,
    nodeEnv: env.nodeEnv
  });
});
