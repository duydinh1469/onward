const prisma = require("../config/prisma");
const { COST_PER_DAY } = require("../constants/pointsConstant");
const { prismaHandle } = require("../utils/prismaHandle");

const { addDays } = require("date-fns");

// @desc Create job post
// @route POST hr/job
// @access Private
const createJob = async (req, res) => {
  const {
    title,
    description,
    benefit,
    requirement,
    package,
    recruitAmount,
    minSalary,
    maxSalary,
    currencyId,
    workTypes,
    hrId,
    companyId,
    points,
    cities,
  } = req.body;

  // Confirm data available
  if (
    !title ||
    !description ||
    !benefit ||
    !requirement ||
    !package ||
    !recruitAmount ||
    !workTypes ||
    !cities ||
    (minSalary && !currencyId) ||
    (maxSalary && !currencyId)
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if company has enough points for package
  if (package * COST_PER_DAY > points) {
    return res.status(400).json({ message: "Not enough points for payment" });
  }

  // Calcualte expiry date
  const expiryDate = addDays(new Date(), package);

  // Get work type array
  const workTypeArray = workTypes.map((workTypeId) => {
    return { id: workTypeId };
  });

  // Get city array
  const cityArray = cities.map((id) => {
    return { id };
  });

  // Need confirm data type (currently catch inside prismaHandle together with unknown error -> should use typescript)
  // Create job post
  const [payment, paymentError, paymentStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.company.update({
        where: {
          id: companyId,
        },
        data: {
          points: points - package * COST_PER_DAY,
        },
      }),
      prisma.job.create({
        data: {
          title,
          description,
          benefit,
          requirement,
          recruitAmount,
          minSalary: minSalary ? minSalary : null,
          maxSalary: maxSalary ? maxSalary : null,
          currencyId:
            (minSalary || maxSalary) && currencyId ? currencyId : null,
          companyId,
          expiredAt: expiryDate,
          authors: {
            connect: {
              id: hrId,
            },
          },
          cities: {
            connect: cityArray,
          },
          workTypes: {
            connect: workTypeArray,
          },
        },
      }),
    ])
  );

  if (!paymentError) {
    return res.status(201).json({ message: "New job post created" });
  } else {
    return res.status(paymentStatus).json({ message: paymentError });
  }
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Get job posts
// @route POST hr/jobs
// @access Private
const getAllJobs = async (req, res) => {
  const { page, pageSize, fromDate, toDate, orderBy, companyId } = req.body;

  // Confirm data available
  if (!page || !pageSize) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Calculate filter condition
  const filterCondition =
    fromDate || toDate
      ? {
          companyId: companyId,
          createAt: {
            gte: fromDate ? new Date(fromDate) : undefined,
            lte: toDate ? new Date(toDate) : undefined,
          },
        }
      : { companyId: companyId };

  // Fetch job posts
  const [posts, postsError, postsStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.job.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where: filterCondition,
        orderBy: {
          // createAt: orderBy ? orderBy : "desc",
          updateAt: orderBy ? orderBy : "desc",
        },
        include: {
          cities: {
            select: {
              id: true,
              name: true,
            },
          },
          workTypes: true,
          authors: {
            select: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.job.count({ where: filterCondition }),
    ])
  );

  if (posts) {
    return res.status(200).json({ jobs: posts[0], totalCount: posts[1] });
  } else {
    return res.status(postsStatus).json({ message: postsError });
  }
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Get job post with id
// @route GET hr/job/:id
// @access Private
const getJobById = async (req, res) => {
  // fetch job post
  const [post, postError, postStatus] = await prismaHandle(
    prisma.job.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        workTypes: true,
        cities: true,
      },
    })
  );

  if (postError) {
    return res.status(postStatus).json({ message: postError });
  }

  // Check if HR is from the same company as job
  if (post?.companyId !== req.body.companyId) {
    return res.status(403).json({ message: "Forbidden" });
  } else {
    return res.status(200).json(post);
  }
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Update job post with id
// @route PUT hr/job/:id
// @access Private
const updateJob = async (req, res) => {
  const {
    title,
    description,
    benefit,
    requirement,
    recruitAmount,
    minSalary,
    maxSalary,
    currencyId,
    package,
    visible,
    cities,
    workTypes,
    hrId,
    companyId,
    points,
  } = req.body;

  // Check data available
  if (
    !title ||
    !description ||
    !benefit ||
    !requirement ||
    !recruitAmount ||
    typeof visible !== "boolean" ||
    !cities ||
    !workTypes ||
    (minSalary && !currencyId) ||
    (maxSalary && !currencyId)
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Check if HR is from the same company as job
  const [jobInfo, jobInfoError, jobInfoStatus] = await prismaHandle(
    prisma.job.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        companyId: true,
        expiredAt: true,
        cities: {
          select: {
            id: true,
          },
        },
        workTypes: {
          select: {
            id: true,
          },
        },
      },
    })
  );

  if (jobInfoError || jobInfo?.companyId !== companyId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Check expired date
  const today = new Date();
  let expiryDate = new Date(jobInfo.expiredAt);

  if (expiryDate < today && !package) {
    return res
      .status(400)
      .json({ message: "Post is expired, need to be renewed" });
  }

  // Get work type array
  const workTypeArray = workTypes.map((workTypeId) => {
    return { id: workTypeId };
  });

  // Get city array
  const cityArray = cities.map((id) => {
    return { id };
  });

  // Buy package
  let paymentPromise = [];
  if (package) {
    if (package * COST_PER_DAY > points) {
      return res.status(400).json({ message: "Not enough points for payment" });
    }

    expiryDate =
      today < expiryDate
        ? addDays(expiryDate, package)
        : addDays(today, package);

    paymentPromise = [
      prisma.company.update({
        where: {
          id: companyId,
        },
        data: {
          points: points - package * COST_PER_DAY,
        },
      }),
    ];
  }

  // Update job post
  const [updatedJob, updatedError, updatedStatus] = await prismaHandle(
    prisma.$transaction([
      ...paymentPromise,
      prisma.job.update({
        where: {
          id: req.params.id,
        },
        data: {
          title,
          description,
          benefit,
          requirement,
          recruitAmount,
          minSalary: minSalary ? minSalary : null,
          maxSalary: maxSalary ? maxSalary : null,
          currencyId:
            (minSalary || maxSalary) && currencyId ? currencyId : null,
          expiredAt: expiryDate,
          visible,
          cities: {
            disconnect: jobInfo.cities,
            connect: cityArray,
          },
          workTypes: {
            disconnect: jobInfo.workTypes,
            connect: workTypeArray,
          },
          authors: {
            connect: {
              id: hrId,
            },
          },
        },
      }),
    ])
  );

  if (!updatedError) {
    return res.status(201).json({ message: "Update job successfull" });
  } else {
    return res.status(updatedStatus).json({ message: updatedError });
  }
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Delete job post with id
// @route DELETE hr/job/:id
// @access Private
const deleteJob = async (req, res) => {
  const { companyId } = req.body;

  // Check if HR is from the same company as job
  const [jobInfo, jobInfoError, jobInfoStatus] = await prismaHandle(
    prisma.job.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        companyId: true,
      },
    })
  );

  if (jobInfoError || jobInfo?.companyId !== companyId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Delete job post
  const [deleteJob, deleteError, deleteStatus] = await prismaHandle(
    prisma.job.delete({
      where: {
        id: req.params.id,
      },
    })
  );

  if (deleteJob) {
    return res.status(204).json({ message: "Delete successfully" });
  } else {
    return res.status(deleteStatus).json({ message: deleteError });
  }
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Change visible
// @route PATCH hr/job/:id/visible
// @access Private
const showJob = async (req, res) => {
  const { companyId, visible } = req.body;

  // Check data available
  if (typeof visible !== "boolean") {
    return res.status(400).json({ message: "Invalid input" });
  }

  // Check if HR is from the same company of job
  const [jobInfo, jobInfoError, jobInfoStatus] = await prismaHandle(
    prisma.job.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        companyId: true,
        expiredAt: true,
      },
    })
  );

  if (jobInfoError || jobInfo.companyId !== companyId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Update job's visible column
  const isExpired = new Date(jobInfo.expiredAt) < new Date() ? true : false;

  const [updateJob, updateError, updateStatus] = await prismaHandle(
    prisma.job.update({
      where: {
        id: req.params.id,
      },
      data: {
        visible: isExpired ? false : visible,
      },
    })
  );

  // prettier-ignore
  if (updateJob) {
    return isExpired
      ? res.status(200).json({ message: "Job is expired. Please purchase package to display the post" })
      : res.status(200).json({ message: "Update visible successfully" });
  } else {
    return res.status(updateStatus).json({message: updateError});
  }
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Purchase package (directly)
// @route POST hr/job/extend/:id
// @access Private
const extendJob = async (req, res) => {
  const { companyId, package, visible, points } = req.body;

  if (!package || typeof visible !== "boolean") {
    return res.status(400).json({ message: "Missing required field" });
  }

  // Check if HR is from the same company as job
  const [jobInfo, jobInfoError, jobInfoStatus] = await prismaHandle(
    prisma.job.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        companyId: true,
        expiredAt: true,
      },
    })
  );

  if (jobInfoError || jobInfo?.companyId !== companyId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Buy package
  if (package * COST_PER_DAY > points) {
    return res.status(400).json({ message: "Not enough points for payment" });
  }

  const today = new Date();
  let expiryDate = new Date(jobInfo.expiredAt);
  expiryDate =
    today < expiryDate ? addDays(expiryDate, package) : addDays(today, package);

  const [payment, paymentError, paymentStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.company.update({
        where: {
          id: companyId,
        },
        data: {
          points: points - package * COST_PER_DAY,
        },
      }),
      prisma.job.update({
        where: {
          id: req.params.id,
        },
        data: {
          expiredAt: expiryDate,
          visible,
        },
      }),
    ])
  );

  if (!paymentError) {
    return res.status(201).json({ message: "Extend job successfully" });
  } else {
    return res.status(paymentStatus).json({ message: paymentError });
  }
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Candidate for certain job
// @route GET
// @access Private
const getAllJobCandidates = async (req, res) => {
  const { companyId, page, pageSize } = req.body;

  // Confirm data available
  if (!page || !pageSize) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Check if HR is from the same company of job
  const [candidates, candidatesError, candidatesStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.job.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          title: true,
        },
      }),
      prisma.candidate.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where: {
          // id: req.params.id,
          appliedJobs: {
            some: {
              AND: [
                {
                  id: req.params.id,
                },
                {
                  companyId: companyId,
                },
              ],
            },
          },
        },
        select: {
          cvLink: true,
          user: {
            select: {
              email: true,
              surname: true,
              givenName: true,
              avatar: true,
              status: true,
            },
          },
        },
      }),
      prisma.candidate.count({
        where: {
          appliedJobs: {
            some: {
              AND: [
                {
                  id: req.params.id,
                },
                {
                  companyId: companyId,
                },
              ],
            },
          },
        },
      }),
    ])
  );

  if (candidatesError || candidates?.length === 0) {
    return res.status(candidatesStatus).json({ candidatesError });
  }

  const resData = candidates[1].map((can) => {
    const { cvLink, user } = can;
    return { ...user, cvLink };
  });
  return res.status(200).json({
    job: candidates[0],
    candidates: resData,
    totalCount: candidates[2],
  });
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Get company general detail
// @route GET hr/company/profile
// @access Private
const getCompanyGeneralProfile = async (req, res) => {
  const { companyId, compVerified } = req.body;

  const [compInfo, compInfoError, compInfoStatus] = await prismaHandle(
    prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        name: true,
        points: true,
        avatar: true,
        loginDate: true,
      },
    })
  );

  if (compInfoError || !compInfo) {
    return res.status(404).json({ message: "Company not found" });
  }

  return res.status(200).json({ ...compInfo, isVerified: compVerified });
};

//-----------------------------------------------------------------------------------------------------------------------
// @desc Get company points
// @route GET hr/company/points
// @access Private
const getCompanyPoints = async (req, res) => {
  const { companyId } = req.body;

  const [compInfo, compInfoError, compInfoStatus] = await prismaHandle(
    prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        points: true,
      },
    })
  );

  if (compInfoError || !compInfo) {
    return res.status(404).json({ message: "Company not found" });
  }

  return res.status(200).json(compInfo);
};

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  showJob,
  extendJob,
  getAllJobCandidates,
  getCompanyGeneralProfile,
  getCompanyPoints,
};
