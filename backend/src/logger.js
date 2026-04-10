function print(method, message, context = {}) {
  const suffix = Object.keys(context).length ? ` ${JSON.stringify(context)}` : "";
  method(`[pixel-desk-backend] ${message}${suffix}`);
}

module.exports = {
  info(message, context) {
    print(console.log, message, context);
  },
  warn(message, context) {
    print(console.warn, message, context);
  },
  error(message, context) {
    print(console.error, message, context);
  }
};
