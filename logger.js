"use strict";

const path = require("path");
const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");

const logger = createLogger({
  level:
    process.env.LOG_LEVEL || process.env.NODE_ENV === "dev" ? "debug" : "info",
  // Default JSON format
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "cod-wz-tournament-api" },
  transports: [
    new transports.Console({
      // Override the default format
      format: format.combine(
        format.colorize(),
        format.printf((info) => {
          // Base output
          let result = `${info.timestamp}: [${info.level}] ${info.message}`;

          // Log errors if any
          if (typeof info.errors !== "undefined")
            info.errors.forEach((error) => (result += ` - ${error.message}`));

          // Log additional fields if any
          if (typeof info.logFields !== "undefined" && info.logFields !== null)
            result += ` (${JSON.stringify(info.logFields)})`;

          return result;
        })
      ),
    }),
  ],
});

if (typeof process.env.LOG_FILE !== "undefined") {
  const filename = path.basename(process.env.LOG_FILE);
  const dirname = path.dirname(process.env.LOG_FILE);

  logger.add(
    new transports.DailyRotateFile({
      filename: filename + ".%DATE%",
      dirname: dirname,
      datePattern: "YYYY-MM-DD",
      zippedArchive: false, // Lots of open issues regarding this option
      maxSize: process.env.LOG_MAX_SIZE || "10m",
      maxFiles: process.env.LOG_MAX_FILES || "7d",
      createSymlink: true,
      symlinkName: filename,
    })
  );
}

module.exports = logger;
