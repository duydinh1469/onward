const { Prisma } = require("@prisma/client");
const { code400, code408 } = require("../constants/prismaError");

async function prismaHandle(prismaPromise) {
  try {
    const result = await prismaPromise;
    return [result, null, 200];
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.log("Known error with code: " + e.code);
      if (code400.includes(e.code)) {
        return [null, "Invalid Data Received", 400];
      } else if (code408.includes(e.code)) {
        return [null, "Request Timeout", 408];
      } else {
        return [null, "Internal Server Error", 500];
      }
    }
    console.log("Message: " + e.message);
    return [null, "Invalid Data Received", 400];
  }
}

module.exports = { prismaHandle: prismaHandle };
