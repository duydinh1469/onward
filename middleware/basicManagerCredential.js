const prisma = require("../config/prisma");
const { prismaHandle } = require("../utils/prismaHandle");

const basicManagerCredential = async (req, res, next) => {
  const { email } = req.body;
  const [userInfo, infoError, infoStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        status: true,
        role: true,
        hrProfile: {
          select: {
            verified: true,
            company: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    })
  );

  if (!userInfo || userInfo.status === "SUSPENDED") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const managerCredential =
    (userInfo?.role.includes("MANAGER") ||
      (userInfo?.hrProfile?.verified && userInfo?.role.includes("HR"))) &&
    (userInfo?.hrProfile.company.status === "VERIFIED" ||
      userInfo?.hrProfile.company.status === "UNVERIFIED");

  if (managerCredential) {
    req.body.managerId = userInfo.id;
    req.body.companyId = userInfo.hrProfile.company.id;
  } else {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

module.exports = basicManagerCredential;
