const prisma = require("../config/prisma");
const { prismaHandle } = require("../utils/prismaHandle");

const {
  firebaseStorageFile,
  firebaseUpload,
  firebaseDelete,
} = require("../utils/firebaseUtils");

const bcrypt = require("bcrypt");

// @desc Check token valid
// @route GET /user/auth
// @access Private
const getAuth = async (req, res) => {
  const { email } = req.body;
  // Retrieve user info
  const [userInfo, infoError, infoStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        givenName: true,
        surname: true,
        email: true,
        status: true,
        avatar: true,
        role: true,
      },
    })
  );

  if (userInfo) {
    return userInfo.status === "SUSPENDED"
      ? res.status(401).json({ message: "Unauthorized" })
      : res.status(200).json(userInfo);
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// @desc Get user info
// @route GET /user/profile
// @access Private
const getUserProfile = async (req, res) => {
  const { email } = req.body;

  // Retrieve user info
  const [userInfo, infoError, infoStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        givenName: true,
        surname: true,
        email: true,
        status: true,
        avatar: true,
        createdAt: true,
        candidateProfile: {
          select: {
            cvLink: true,
          },
        },
        hrProfile: {
          select: {
            phoneNumber: true,
          },
        },
      },
    })
  );

  if (userInfo) {
    return userInfo.status === "SUSPENDED"
      ? res.status(401).json({ message: "Unauthorized" })
      : res.status(200).json(userInfo);
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Update user with id
// @route PUT /user/profile
// @access Private
const updateUserProfile = async (req, res) => {
  const { email, givenName, surname, role, phoneNumber, avatarLink, cvLink } =
    req.body;

  // Check if user is not suspended
  const [userInfo, userInfoError, userInfoStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        status: true,
        role: true,
        avatar: true,
        candidateProfile: {
          select: {
            cvLink: true,
          },
        },
      },
    })
  );

  if (userInfo?.status !== "VERIFIED" && userInfo?.status !== "UNVERIFIED") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check for data available
  if (
    !givenName ||
    !surname ||
    ((role.includes("MANAGER") || role.includes("HR")) && !phoneNumber)
    // !avatarLink
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Upload files to server
  let avatar = null;
  let avatarDirectory = [];
  let cv = null;
  let cvDirectory = [];
  if (req.files) {
    const [avatarPromise, avatarURL, avatarPath] = firebaseUpload(
      req.files["avatar"],
      `user/${userInfo.id}/`
    );
    const [cvPromise, cvURL, cvPath] = userInfo.role.includes("CANDIDATE")
      ? firebaseUpload(req.files["cv"], `user/${userInfo.id}/cv/`)
      : [[], [], []];

    avatarDirectory = avatarPath;
    cvDirectory = cvPath;

    const promiseValue = await Promise.allSettled([
      ...avatarPromise,
      ...cvPromise,
    ]);
    if (promiseValue.some((val) => val.status === "rejected")) {
      const removeFiles = firebaseDelete([...avatarPath, ...cvPath]);
      await Promise.all(removeFiles).catch((e) => console.log(e));
      return res
        .status(500)
        .json({ message: "Internal server error: Failed to upload files" });
    }

    avatar = avatarURL.length > 0 ? avatarURL[0] : null;
    cv = cvURL.length > 0 ? cvURL[0] : null;
  }

  // Create update object
  let updateObject = {
    givenName: givenName,
    surname: surname,
  };

  userInfo.role.includes("MANAGER") || userInfo.role.includes("HR")
    ? (updateObject = {
        ...updateObject,
        hrProfile: {
          update: {
            phoneNumber,
          },
        },
      })
    : null;

  avatar
    ? (updateObject = { ...updateObject, avatar: avatar })
    : avatarLink !== userInfo.avatar
    ? (updateObject = { ...updateObject, avatar: null })
    : null;
  cv
    ? (updateObject = {
        ...updateObject,
        candidateProfile: {
          update: {
            cvLink: cv,
          },
        },
      })
    : cvLink !== userInfo.candidateProfile?.cvLink &&
      // cvLink is optional => must check undefined unlike avatarLink
      // cvLink &&
      userInfo.role.includes("CANDIDATE")
    ? (updateObject = {
        ...updateObject,
        candidateProfile: {
          update: {
            cvLink: null,
          },
        },
      })
    : null;

  // Update to database
  const [updateProfile, updateError, updateStatus] = await prismaHandle(
    prisma.user.update({
      where: {
        id: userInfo.id,
      },
      data: updateObject,
    })
  );

  // prettier-ignore
  if (!updateError) {
    const removeAvatar = updateObject.hasOwnProperty("avatar") ? [firebaseStorageFile(userInfo.avatar)] : []
    const removeCV = updateObject.hasOwnProperty("candidateProfile") ? [firebaseStorageFile(userInfo.candidateProfile.cvLink)] : []
    const removeFiles = firebaseDelete([
      ...removeAvatar, 
      ...removeCV, 
    ]);
    await Promise.all(removeFiles).catch((e) => console.log(e));
    return res.status(201).json({ message: "Update successfully" });
  } else {
    const removeFiles = firebaseDelete([
      ...avatarDirectory, 
      ...cvDirectory, 
    ])
    await Promise.all(removeFiles).catch((e) => console.log(e));
    return res.status(updateStatus).json({message: updateError});
  }
};

//----------------------------------------------------------------------------------------------
// @desc Update user with id
// @route POST /user/profile
// @access Private
const changePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  // Check missing fields
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if new password is different from old password
  if (newPassword === oldPassword) {
    return res
      .status(400)
      .json({ message: "New password must be different from old password" });
  }

  // Check password strength
  const regex =
    /^(?!.* )(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[#?!@$%^&*-]).{8,20}$/g;
  if (newPassword.match(regex) === null) {
    return res.status(400).json({ message: "Weak password" });
  }

  // Retrieve user info
  const [userInfo, userInfoError, userInfoStatus] = await prismaHandle(
    prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        password: true,
        status: true,
      },
    })
  );

  if (!userInfo || userInfo.status === "SUSPENDED")
    return res.status(401).json({ message: "Unauthorized" });

  // Check old password is match
  const match = await bcrypt.compare(oldPassword, userInfo.password);
  if (!match) return res.status(400).json({ message: "Password not match" });

  // Change password
  const hashPwd = await bcrypt.hash(newPassword, 10); //salt rounds
  const [updateUser, updateError, updateStatus] = await prismaHandle(
    prisma.user.update({
      where: {
        email: email,
      },
      data: {
        password: hashPwd,
      },
    })
  );

  if (!updateError) {
    return res.status(201).json({ message: "Change password successfully" });
  } else {
    return res.status(updateStatus).json({ message: updateError });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAuth,
};
