const prisma = require("../config/prisma");
const { prismaHandle } = require("../utils/prismaHandle");

const candidateCredential = async (req, res, next) => {
  const { email } = req.body;

  // Check if user is candidate (ONLY)
  const [candidateInfo, infoError, infoStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        status: true,
        role: true,
        candidateProfile: {
          select: {
            cvLink: true,
          },
        },
      },
    })
  );

  if (!candidateInfo || candidateInfo.status === "SUSPENDED") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (candidateInfo?.role.includes("CANDIDATE")) {
    req.body.candidateId = candidateInfo.id;
    req.body.cvLink = candidateInfo.candidateProfile.cvLink;
  } else {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

module.exports = candidateCredential;
