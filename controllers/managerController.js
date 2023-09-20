const prisma = require("../config/prisma");
const { prismaHandle } = require("../utils/prismaHandle");

const path = require("path");
const {
  firebaseUpload,
  firebaseDelete,
  firebaseStorageFile,
} = require("../utils/firebaseUtils");
const { isToday } = require("date-fns");
const { POINT_LIMIT, POINT_DAILY } = require("../constants/pointsConstant");

//----------------------------------------------------------------------------------------------
// @desc Get company with id
// @route GET /company/profile
// @access Private

const getCompanyProfile = async (req, res) => {
  const { companyId } = req.body;
  const [companyInfo, infoError, infoStatus] = await prismaHandle(
    prisma.company.findUnique({
      where: {
        id: companyId,
      },
      include: {
        district: {
          include: {
            city: {
              include: {
                country: true,
              },
            },
          },
        },
        companyImages: {
          select: {
            imageLink: true,
          },
        },
      },
    })
  );

  if (!infoError) {
    return res.status(200).json(companyInfo);
  } else {
    return res.status(infoStatus).json({ message: infoError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Update company with id
// @route PUT /company/profile
// @access Private
const updateCompanyProfile = async (req, res) => {
  // prettier-ignore
  const { email, address, scale, website, districtId, description, representer, introImages = [], avatarLink, wallpaperLink } = req.body;

  // Check user input
  if (
    !address ||
    !scale ||
    !website ||
    !districtId ||
    !description ||
    !representer ||
    !introImages
    // !avatarLink ||
    // !wallpaperLink
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Retrieve manager data
  let companyId = null;
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
                avatar: true,
                wallpaper: true,
                companyImages: true,
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
    userInfo?.role.includes("MANAGER") &&
    (userInfo?.hrProfile.company.status === "VERIFIED" ||
      userInfo?.hrProfile.company.status === "UNVERIFIED");

  if (managerCredential) {
    companyId = userInfo.hrProfile.company.id;
  } else {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Upload files to storage
  let companyImages = [];
  let companyDirectory = [];
  let avatar = null;
  let avatarDirectory = [];
  let wallpaper = null;
  let wallpaperDirectory = [];

  if (req.files) {
    const [avatarPromises, avatarURL, avatarPath] = firebaseUpload(
      req.files["avatar"],
      `company/${companyId}/`,
      // prettier-ignore
      `avatar${path.extname(req.files["avatar"]?.[0]?.originalname || 'avatar.png')}`
    );
    const [wallpaperPromises, wallpaperURL, wallpaperPath] = firebaseUpload(
      req.files["wallpaper"],
      `company/${companyId}/`,
      // prettier-ignore
      `wallpaper${path.extname(req.files["wallpaper"]?.[0]?.originalname || 'wallpaper.png')}`
    );
    const [introImagePromises, introImageURL, introImagePath] = firebaseUpload(
      req.files["intro"],
      `company/${companyId}/intro/`
    );

    // Retrieve file's path
    avatarDirectory = avatarPath;
    wallpaperDirectory = wallpaperPath;
    companyDirectory = introImagePath;

    // Upload files
    const promiseValue = await Promise.allSettled([
      ...avatarPromises,
      ...wallpaperPromises,
      ...introImagePromises,
    ]);

    // Delete all upload files if any promise got reject (failed to upload file)
    if (promiseValue.some((val) => val.status === "rejected")) {
      const removeFiles = firebaseDelete([
        ...avatarPath,
        ...wallpaperPath,
        ...introImagePath,
      ]);
      await Promise.all(removeFiles).catch((e) => console.log(e));
      return res
        .status(500)
        .json({ message: "Internal server error: Failed to upload files" });
    }

    // Retrieve file URL
    avatar = avatarURL.length > 0 ? avatarURL[0] : null;
    wallpaper = wallpaperURL.length > 0 ? wallpaperURL[0] : null;
    companyImages = introImageURL.map((url) => {
      return { imageLink: url };
    });
  }

  // Create update object
  let updateObject = {
    address: address,
    scale: scale,
    website: website,
    districtId: parseInt(districtId),
    description: description,
    representer: representer,
    status: "VERIFIED",
  };

  // Update if user upload new avatar/wallpaper
  avatar
    ? (updateObject = { ...updateObject, avatar: avatar })
    : avatarLink !== userInfo.hrProfile.company.avatar
    ? (updateObject = { ...updateObject, avatar: null })
    : null;
  wallpaper
    ? (updateObject = { ...updateObject, wallpaper: wallpaper })
    : wallpaperLink !== userInfo.hrProfile.company.wallpaper
    ? (updateObject = { ...updateObject, wallpaper: null })
    : null;

  // Retrieve old company images that user want to keep
  const oldIntroImages = userInfo.hrProfile.company.companyImages
    .filter((img) =>
      introImages.some((item) => img.imageLink === JSON.parse(item)?.imageLink)
    )
    .map((item) => {
      return { imageLink: item.imageLink };
    });

  // Include old images with the new upload
  companyImages = [...oldIntroImages, ...companyImages];
  companyImages.length >= 0
    ? (updateObject = {
        ...updateObject,
        companyImages: {
          deleteMany: {},
          createMany: {
            data: companyImages,
          },
        },
      })
    : null;

  // Get list of delete images directory
  const deleteImages = userInfo.hrProfile.company.companyImages
    .filter(
      (img) =>
        !introImages?.some(
          (item) => img.imageLink === JSON.parse(item)?.imageLink
        )
    )
    .map((item) => firebaseStorageFile(item.imageLink));
  // Update database
  const [updateCompany, updateError, updateStatus] = await prismaHandle(
    prisma.company.update({
      where: {
        id: companyId,
      },
      data: updateObject,
    })
  );

  // prettier-ignore
  if (!updateError) {
    const removeAvatar = updateObject.hasOwnProperty("avatar") ? [firebaseStorageFile(userInfo.hrProfile.company.avatar)] : []
    const removeWallpaper = updateObject.hasOwnProperty("wallpaper") ? [firebaseStorageFile(userInfo.hrProfile.company.wallpaper)] : []
    const removeFiles = firebaseDelete([
      ...removeAvatar, 
      ...removeWallpaper, 
      ...deleteImages
    ]);
    await Promise.all(removeFiles).catch((e) => console.log(e));
    return res.status(201).json({ message: "Update successfully" });
  } else {
    const removeFiles = firebaseDelete([
      ...avatarDirectory, 
      ...wallpaperDirectory, 
      ...companyDirectory
    ])
    await Promise.all(removeFiles).catch((e) => console.log(e));
    return res.status(updateStatus).json({message: updateError});
  }
};

//----------------------------------------------------------------------------------------------
// @desc Attendance
// @route POST /company/attendance
// @access Private
const attendance = async (req, res) => {
  const { companyId } = req.body;

  const [companyInfo, infoError, infoStatus] = await prismaHandle(
    prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        loginDate: true,
        points: true,
      },
    })
  );

  if (infoError) {
    return res.status(infoStatus).json({ message: infoError });
  }

  if (isToday(companyInfo.loginDate)) {
    return res
      .status(400)
      .json({ message: "Attendance has been checked for today" });
  }

  if (companyInfo.points >= POINT_LIMIT) {
    return res.status(201).json({ atLimit: true, points: companyInfo.points });
  }

  const newPoints =
    companyInfo.points >= POINT_LIMIT - POINT_DAILY
      ? POINT_LIMIT
      : companyInfo.points + POINT_DAILY;

  const [attendance, attendanceError, attendanceStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.company.update({
        where: {
          id: companyId,
        },
        data: {
          loginDate: new Date(),
          points: newPoints,
        },
      }),
    ])
  );

  if (!attendanceError) {
    return res.status(201).json({ attended: true, points: newPoints });
  } else {
    return res.status(attendanceStatus).json({ message: attendanceError });
  }
};

module.exports = { getCompanyProfile, updateCompanyProfile, attendance };
