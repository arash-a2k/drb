type LogFields = Record<string, unknown>;

function writeLog(level: 'info' | 'warn' | 'error', message: string, fields: LogFields = {}): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) => writeLog('info', message, fields),
  warn: (message: string, fields?: LogFields) => writeLog('warn', message, fields),
  error: (message: string, fields?: LogFields) => writeLog('error', message, fields),
};
