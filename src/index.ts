// this will log to files in the logs folder
import fs from "fs";
import path from "path";
import SendGridController from "./send-grid";
import ResponseHelper from "./helpers/response.helper";

let logDir = path.join(__dirname, "../../../logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
enum LogType {
  INFO = "INFO",
  ERROR = "ERROR",
  WARN = "WARN",
  DEBUG = "DEBUG",
}

const setLogDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  logDir = dir;
};

const LogMessageToFile = ({
  message,
  user,
  type,
}: {
  message: any;
  user?: string;
  type: LogType;
}) => {
  if (!user || user.length === 0) {
    user = "general";
  }
  let errorMessage = "";
  let stackTrace = "";

  if (message instanceof Error) {
    // If message is an Error, extract information
    errorMessage = message.message || "";
    stackTrace = message.stack || "";
  } else {
    // If message is a string, use it as is
    errorMessage = message;
  }

  console.log(`${type} ${errorMessage}`);

  const currentDay = new Date().toISOString().split("T")[0];
  const newLogDir = path.join(logDir, currentDay);
  if (!fs.existsSync(newLogDir)) {
    fs.mkdirSync(newLogDir);
  }

  const logFilePath = path.join(newLogDir, `${user}.${type}.log`);
  let logMessage = `${new Date().toISOString()}: ${type} ${errorMessage}\n`;
  // Append stack trace if available
  if (stackTrace) {
    logMessage += `Stack Trace:\n${stackTrace}\n`;
  }
  fs.appendFileSync(logFilePath, logMessage);
};

const LoggingHelper = {
  LogMessageToFile,
  setLogDir,
  LogType,
};

export default LoggingHelper;

export { SendGridController, ResponseHelper };
