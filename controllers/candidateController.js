const prisma = require("../config/prisma");
const { prismaHandle } = require("../utils/prismaHandle");

const { firebaseUpload, firebaseDelete } = require("../utils/firebaseUtils");

//----------------------------------------------------------------------------------------------
// @desc Get CV link
// @route GET /user/candidateCV
// @access Private
const getCV = async (req, res) => {
  const { cvLink } = req.body;
  if (cvLink) return res.status(200).json({ cvLink });
  return res.status(200).json({ cvLink: null });
};

//----------------------------------------------------------------------------------------------
// @desc Apply job
// @route POST /user/apply
// @access Private
const applyJob = async (req, res) => {
  const { candidateId, jobId, cvLink } = req.body;

  if (!cvLink) {
    return res.status(400).json({ message: "No CV available to apply" });
  }

  const [apply, applyError, applyStatus] = await prismaHandle(
    prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        appliedJobs: {
          connect: {
            id: jobId,
          },
        },
      },
    })
  );

  if (!applyError) {
    return res.status(201).json({ applied: true });
  } else {
    return res.status(applyStatus).json({ message: applyError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Mark job
// @route POST /user/like
// @access Private
const markJob = async (req, res) => {
  const { candidateId, jobId } = req.body;
  const [mark, markError, markStatus] = await prismaHandle(
    prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        markedJobs: {
          connect: {
            id: jobId,
          },
        },
      },
    })
  );

  if (!markError) {
    return res.status(201).json({ marked: true });
  } else {
    return res.status(markStatus).json({ message: markError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Un-mark job
// @route DELETE /user/like
// @access Private
const unmarkJob = async (req, res) => {
  const { candidateId, jobId } = req.body;
  const [unmark, unmarkError, unmarkStatus] = await prismaHandle(
    prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        markedJobs: {
          disconnect: {
            id: jobId,
          },
        },
      },
    })
  );

  if (!unmarkError) {
    return res.status(201).json({ marked: false });
  } else {
    return res.status(unmarkStatus).json({ message: unmarkError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Report job
// @route POST /user/report
// @access Private
const reportJob = async (req, res) => {
  const { candidateId, jobId, detail } = req.body;

  const [isReported, isReportedError, isReportedStatus] = await prismaHandle(
    prisma.jobReported.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidateId,
          jobId: jobId,
        },
      },
      select: {
        id: true,
      },
    })
  );

  if (isReported) {
    return res.status(400).json({ message: "Job was reported by user" });
  }

  // Retrieve image url if exist
  let imageArray = [];
  let imageDirectory = [];

  if (req.files) {
    const [imagePromise, imageURL, imagePath] = firebaseUpload(
      req.files,
      `reports/${jobId}/${candidateId}/`
    );

    imageDirectory = imagePath;

    const promiseValue = await Promise.allSettled(imagePromise);

    if (promiseValue.some((val) => val.status === "rejected")) {
      const removeFiles = firebaseDelete(imagePath);
      await Promise.all(removeFiles).catch((e) => console.log(e));
      return res
        .status(500)
        .json({ message: "Internal server error: Failed to upload files" });
    }

    imageArray = imageURL.map((url) => {
      return { imageLink: url };
    });
  }

  // Create report
  const [report, reportError, reportStatus] = await prismaHandle(
    prisma.jobReported.create({
      data: {
        candidateId: candidateId,
        jobId: jobId,
        detail: detail,
        reportImages: {
          create: imageArray,
        },
      },
    })
  );

  if (!reportError) {
    return res.status(201).json({ message: "Report sent" });
  } else {
    // Delete upload file of fail request
    const removeFiles = firebaseDelete(imageDirectory);
    await Promise.all(removeFiles).catch((e) =>
      console.log("Failed to delete invalid data's uploaded files")
    );
    return res.status(reportStatus).json({ message: reportError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Follow company
// @route POST /user/follow
// @access Private
const followCompany = async (req, res) => {
  const { candidateId, companyId } = req.body;
  const [follow, followError, followStatus] = await prismaHandle(
    prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        following: {
          connect: {
            id: companyId,
          },
        },
      },
    })
  );

  if (!followError) {
    return res.status(201).json({ followed: true });
  } else {
    return res.status(followStatus).json({ message: followError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Un-follow company
// @route DELETE /user/unfollow
// @access Private
const unfollowCompany = async (req, res) => {
  const { candidateId, companyId } = req.body;
  const [unfollow, unfollowError, unfollowStatus] = await prismaHandle(
    prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        following: {
          disconnect: {
            id: companyId,
          },
        },
      },
    })
  );

  if (!unfollowError) {
    return res.status(201).json({ followed: false });
  } else {
    return res.status(unfollowStatus).json({ message: unfollowError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Get applied jobs
// @route POST /user/allApplied
// @access Private
const getAllAppliedJobs = async (req, res) => {
  const { page, pageSize, fromDate, toDate, orderBy, candidateId } = req.body;

  if (!page || !pageSize) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Calculate filter condition
  const createAtCondition =
    fromDate || toDate
      ? {
          createAt: {
            gte: fromDate ? new Date(fromDate) : undefined,
            lte: toDate ? new Date(toDate) : undefined,
          },
        }
      : {};

  const [allApplied, allAppliedError, allAppliedStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.job.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where: {
          AND: [
            {
              candidates: {
                some: {
                  id: candidateId,
                },
              },
            },
            createAtCondition,
          ],
        },
        orderBy: {
          createAt: orderBy ? orderBy : "desc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          benefit: true,
          requirement: true,
          updateAt: true,
          expiredAt: true,
          recruitAmount: true,
          maxSalary: true,
          minSalary: true,
          currency: true,
          cities: true,
          workTypes: true,
          visible: true,
          company: {
            select: {
              name: true,
              avatar: true,
              wallpaper: true,
            },
          },
          jobReportedList: {
            where: {
              candidateId: candidateId,
            },
            select: {
              id: true,
            },
          },
          markedByList: {
            where: {
              id: candidateId,
            },
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.job.count({
        where: {
          AND: [
            {
              candidates: {
                some: {
                  id: candidateId,
                },
              },
            },
            createAtCondition,
          ],
        },
      }),
    ])
  );

  if (!allAppliedError) {
    const resData = allApplied[0].map((job) => {
      const { markedByList, jobReportedList, ...rest } = job;
      return {
        ...rest,
        isApplied: true,
        isMarked: markedByList.length > 0 ? true : false,
        isReported: jobReportedList.length > 0 ? true : false,
      };
    });
    return res.status(200).json({ jobs: resData, totalCount: allApplied[1] });
  } else {
    return res.status(allAppliedStatus).json({ message: allAppliedError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Get mark jobs
// @route POST /user/allLikes
// @access Private
const getAllMarkedJobs = async (req, res) => {
  const { page, pageSize, fromDate, toDate, orderBy, candidateId } = req.body;

  if (!page || !pageSize) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Calculate filter condition
  const createAtCondition =
    fromDate || toDate
      ? {
          createAt: {
            gte: fromDate ? new Date(fromDate) : undefined,
            lte: toDate ? new Date(toDate) : undefined,
          },
        }
      : {};

  const [allMark, allMarkError, allMarkStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.job.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where: {
          AND: [
            {
              markedByList: {
                some: {
                  id: candidateId,
                },
              },
            },
            createAtCondition,
          ],
        },
        orderBy: {
          createAt: orderBy ? orderBy : "desc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          benefit: true,
          requirement: true,
          updateAt: true,
          expiredAt: true,
          recruitAmount: true,
          maxSalary: true,
          minSalary: true,
          currency: true,
          cities: true,
          workTypes: true,
          visible: true,
          company: {
            select: {
              name: true,
              avatar: true,
              wallpaper: true,
            },
          },
          candidates: {
            where: {
              id: candidateId,
            },
            select: {
              id: true,
            },
          },
          jobReportedList: {
            where: {
              candidateId: candidateId,
            },
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.job.count({
        where: {
          AND: [
            {
              markedByList: {
                some: {
                  id: candidateId,
                },
              },
            },
            createAtCondition,
          ],
        },
      }),
    ])
  );

  if (!allMarkError) {
    const resData = allMark[0].map((job) => {
      const { candidates, jobReportedList, ...rest } = job;
      return {
        ...rest,
        isMarked: true,
        isApplied: candidates.length > 0 ? true : false,
        isReported: jobReportedList.length > 0 ? true : false,
      };
    });
    return res.status(200).json({ jobs: resData, totalCount: allMark[1] });
  } else {
    return res.status(allMarkStatus).json({ message: allMarkError });
  }
};

// @desc Get following companies
// @route POST /user/allFollowing
// @access Private
const getAllFollowingCompany = async (req, res) => {
  const { page, pageSize, candidateId } = req.body;

  if (!page || !pageSize) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Calculate filter condition
  const [allFollowing, allFollowingError, allFollowingStatus] =
    await prismaHandle(
      prisma.$transaction([
        prisma.company.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            follower: {
              some: {
                id: candidateId,
              },
            },
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            address: true,
            website: true,
            district: {
              select: {
                name: true,
                city: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                follower: true,
              },
            },
          },
        }),
        prisma.company.count({
          where: {
            follower: {
              some: {
                id: candidateId,
              },
            },
          },
        }),
      ])
    );

  if (!allFollowingError) {
    const resData = allFollowing[0].map((comp) => {
      const { _count, ...rest } = comp;
      return {
        ...rest,
        followNumber: _count.follower,
      };
    });
    return res
      .status(200)
      .json({ companies: resData, totalCount: allFollowing[1] });
  } else {
    return res.status(allFollowingStatus).json({ message: allFollowingError });
  }
};

module.exports = {
  getCV,
  applyJob,
  markJob,
  unmarkJob,
  reportJob,
  followCompany,
  unfollowCompany,
  getAllAppliedJobs,
  getAllMarkedJobs,
  getAllFollowingCompany,
};
