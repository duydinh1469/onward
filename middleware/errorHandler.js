const { logEvents } = require("./logger");

// override express default error handler middleware
const errorHandler = (err, req, res, next) => {
  logEvents(`${err.name}: ${err.message}`, "errorLog.txt");
  console.log(err.stack);

  const status = res.statusCode ? res.statusCode : 500;
  res.status(status);
  res.json({ message: err.message });
};

module.exports = errorHandler;
