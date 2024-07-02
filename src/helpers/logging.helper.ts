import fs from "fs";
import path from "path";
import SendGridController, { EmailSeverity } from "../send-grid";

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
  severity = EmailSeverity.LOW,
  notifyAdmin = false,
  logToConsole = true,
  listToNotify,
}: {
  message: any;
  user?: string;
  type: LogType;
  severity?: EmailSeverity;
  notifyAdmin?: boolean;
  logToConsole?: boolean;
  listToNotify?: string | string[];
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

  if (logToConsole) console.log(`${type} ${errorMessage}`);

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

  if (notifyAdmin) {
    const html = `
      <h1>${type} Log</h1>
      <p>User: ${user}</p>
      <p>Severity: ${severity}</p>
      <p>Message Log:</p>      
      <p>${logMessage}</p>
    `;

    SendGridController.sendAnyTemplate({
      to: listToNotify,
      html,
      subject: `${user} ${type} Log`,
      inCludeNameInSubject: true,
    });
  }
};

const LoggingHelper = {
  LogMessageToFile,
  setLogDir,
  LogType,
};

export default LoggingHelper;
