const prisma = require("../config/prisma");
const { prismaHandle } = require("../utils/prismaHandle");

const hrCredential = async (req, res, next) => {
  const { email } = req.body;

  // Check user is verified
  const [user, userDtoError, userDtoStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        hrProfile: {
          select: {
            verified: true,
            company: {
              select: {
                id: true,
                status: true,
                points: true,
              },
            },
          },
        },
      },
    })
  );

  if (!user || user.status === "SUSPENDED") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const hrCredential =
    user?.status === "VERIFIED" &&
    (user?.role?.includes("MANAGER") || user?.role?.includes("HR")) &&
    user?.hrProfile.verified &&
    user?.hrProfile.company.status !== "SUSPENDED";

  if (hrCredential) {
    req.body.hrId = user.id;
    req.body.companyId = user.hrProfile.company.id;
    req.body.points = user.hrProfile.company.points;
    req.body.compVerified = user.hrProfile.company.status === "VERIFIED";
  } else {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Continue request
  next();
};

module.exports = hrCredential;
