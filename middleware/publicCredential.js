const jwt = require("jsonwebtoken");
const { prismaHandle } = require("../utils/prismaHandle");
const prisma = require("../config/prisma");

const publicCredential = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader?.split(" ")[1];

  if (!token) {
    next();
    return;
  }

  let email = null;

  await jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET,

    (err, decoded) => {
      if (err) {
        next();
        return;
      }
      email = decoded?.UserInfo?.email;
    }
  );

  if (!email) {
    next();
    return;
  }

  const [candidateInfo, infoError, infoStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        role: true,
      },
    })
  );

  if (!candidateInfo) {
    next();
    return;
  }

  if (candidateInfo?.role.includes("CANDIDATE")) {
    req.body.candidateId = candidateInfo.id;
  }

  next();
};

module.exports = publicCredential;
