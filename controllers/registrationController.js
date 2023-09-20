const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const { prismaHandle } = require("../utils/prismaHandle");

// @desc Registration
// @route POST /register/user
const registration = async (req, res) => {
  const { email, password, givenName, surname } = req.body;

  // Confirm data
  if (!email || !password || !givenName || !surname) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check password strength
  const regex =
    /^(?!.* )(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[#?!@$%^&*-]).{8,20}$/g;
  if (password.match(regex) === null) {
    return res.status(400).json({ message: "Weak password" });
  }

  // Check for duplicate
  const [duplicate, dupError, dupStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    })
  );

  if (duplicate) {
    return res.status(409).json({ message: "Email already been used" });
  } else if (dupError) {
    return res.status(dupStatus).json({ message: dupError });
  }

  // Hash password
  const hashPwd = await bcrypt.hash(password, 10); //salt rounds
  const userObject = {
    email: email.toLowerCase(),
    password: hashPwd,
    givenName,
    surname,
  };

  const [user, errorMsg, statusCode] = await prismaHandle(
    prisma.user.create({
      data: {
        ...userObject,
        candidateProfile: {
          create: {},
        },
      },
    })
  );

  if (!errorMsg) {
    res.status(201).json({ message: "New user created" });
  } else {
    res.status(statusCode).json({ message: errorMsg });
  }
};

// @desc Registration
// @route POST /register/company
const companyRegistration = async (req, res) => {
  const {
    email,
    password,
    givenName,
    surname,
    name,
    scale,
    website,
    phoneNumber,
    address,
    districtId,
  } = req.body;

  // Confirm data
  if (
    !email ||
    !password ||
    !givenName ||
    !surname ||
    !name ||
    !scale ||
    !website ||
    !phoneNumber ||
    !address ||
    !districtId
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check password strength
  const regex =
    /^(?!.* )(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[#?!@$%^&*-]).{8,20}$/g;
  if (password.match(regex) === null) {
    return res.status(400).json({ message: "Weak password" });
  }

  // Check for duplicate
  const [duplicate, dupError, dupStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    })
  );

  if (duplicate) {
    return res.status(409).json({ message: "Email already been used" });
  } else if (dupError) {
    return res.status(dupStatus).json({ message: dupError });
  }

  // Hash password
  const hashPwd = await bcrypt.hash(password, 10); //salt rounds
  const userObject = {
    email: email.toLowerCase(),
    password: hashPwd,
    givenName,
    surname,
    role: ["MANAGER"],
    status: "VERIFIED",
  };
  const companyObject = {
    name,
    website,
    scale,
    address,
    districtId,
  };

  const [manager, managerError, managerStatus] = await prismaHandle(
    prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: userObject,
      });

      const newCompany = await tx.company.create({
        data: {
          ...companyObject,
          hrs: {
            create: {
              id: newUser.id,
              verified: true,
              phoneNumber,
            },
          },
        },
      });

      return { newUser, newCompany };
    })
  );

  if (manager) {
    res.status(201).json({ message: "New company created" });
  } else {
    res.status(managerStatus).json({ message: managerError });
  }
};

module.exports = {
  registration,
  companyRegistration,
};
