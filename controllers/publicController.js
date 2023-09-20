const prisma = require("../config/prisma");
const { BusinessScale } = require("@prisma/client");
const { prismaHandle } = require("../utils/prismaHandle");

//----------------------------------------------------------------------------------------------
// @desc Get all jobs
// @route POST /public/allJobs
// @access Public
const getAllJobs = async (req, res) => {
  const {
    page,
    pageSize,
    fromDate,
    toDate,
    orderBy,
    searchPhrase,
    location,
    type,
  } = req.body;

  if (!page || !pageSize || !searchPhrase) {
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

  const locationCondition =
    location?.length > 0
      ? {
          OR: location.map((city) => {
            return {
              cities: {
                some: {
                  id: city,
                },
              },
            };
          }),
        }
      : {};

  const typeCondition = type
    ? {
        workTypes: {
          some: {
            id: type,
          },
        },
      }
    : {};

  const searchWords = searchPhrase.trim().split(/\s+/);
  const searchCondition =
    searchWords.length > 0 && searchWords[0] !== ""
      ? {
          OR: [
            {
              title: {
                search: searchWords.join(" & "),
              },
            },
            {
              description: {
                search: searchWords.join(" & "),
              },
            },
            {
              requirement: {
                search: searchWords.join(" & "),
              },
            },
          ],
        }
      : null;

  const visibleCondition = [
    {
      visible: true,
    },
    {
      expiredAt: {
        gt: new Date(),
      },
    },
  ];

  // Fetch job posts
  const [posts, postsError, postsStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.job.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where: {
          AND: [
            createAtCondition,
            searchCondition,
            locationCondition,
            typeCondition,
            ...visibleCondition,
          ],
        },
        orderBy: {
          createAt: orderBy ? orderBy : "desc",
        },
        select: {
          id: true,
          title: true,
          cities: {
            select: {
              id: true,
              name: true,
            },
          },
          updateAt: true,
          expiredAt: true,
          company: {
            select: {
              id: true,
              avatar: true,
              wallpaper: true,
              name: true,
            },
          },
          workTypes: true,
          requirement: true,
        },
      }),
      prisma.job.count({
        where: {
          AND: [createAtCondition, searchCondition, ...visibleCondition],
        },
      }),
    ])
  );

  if (posts) {
    return res.status(200).json({ jobs: posts[0], totalCount: posts[1] });
  } else {
    return res.status(postsStatus).json({ message: postsError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Get job info with id
// @route GET /public/job/:id
// @access Public
const getJobInfo = async (req, res) => {
  const { candidateId } = req.body;
  const [jobPost, postError, postStatus] = await prismaHandle(
    prisma.job.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        cities: {
          select: {
            id: true,
            name: true,
          },
        },
        currency: true,
        workTypes: true,
        markedByList: candidateId
          ? {
              where: {
                id: candidateId,
              },
              select: {
                id: true,
              },
            }
          : false,
        candidates: candidateId
          ? {
              where: {
                id: candidateId,
              },
              select: {
                id: true,
              },
            }
          : false,
        jobReportedList: candidateId
          ? {
              where: {
                candidateId: candidateId,
              },
              select: {
                id: true,
              },
            }
          : false,
        _count: {
          select: {
            jobReportedList: true,
          },
        },
      },
    })
  );

  if (jobPost) {
    const { markedByList, candidates, jobReportedList, _count, ...rest } =
      jobPost;
    const resData = {
      ...rest,
      isMarked: markedByList && markedByList.length > 0 ? true : false,
      isApplied: candidates && candidates.length > 0 ? true : false,
      isReported: jobReportedList && jobReportedList.length > 0 ? true : false,
      reportNumber: _count.jobReportedList,
    };

    return res.status(200).json(resData);
  } else {
    return res.status(400).json({ message: "Job not found" });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Get company info with id
// @route GET /public/company/:id
// @access Public
const getCompanyInfo = async (req, res) => {
  const { candidateId } = req.body;
  const [companyInfo, infoError, infoStatus] = await prismaHandle(
    prisma.company.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        id: true,
        name: true,
        address: true,
        scale: true,
        website: true,
        avatar: true,
        wallpaper: true,
        description: true,
        representer: true,
        district: {
          select: {
            id: true,
            name: true,
            city: {
              select: {
                id: true,
                name: true,
                countryCode: true,
              },
            },
          },
        },
        companyImages: {
          select: {
            imageLink: true,
          },
        },
        follower: candidateId
          ? {
              where: {
                id: candidateId,
              },
              select: {
                id: true,
              },
            }
          : false,
        _count: {
          select: {
            follower: true,
          },
        },
      },
    })
  );

  if (!infoError && companyInfo) {
    const { follower, _count, ...rest } = companyInfo;
    const resData = {
      ...rest,
      isFollowed: follower && follower.length > 0 ? true : false,
      followNumber: _count.follower,
    };
    return res.status(200).json(resData);
  } else {
    return res.status(400).json({ message: "Company not found" });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Get company jobs with company id
// @route GET /public/company/allJobs
// @access Public
const getCompanyJobs = async (req, res) => {
  const { page, pageSize } = req.body;

  if (!page || !pageSize) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Fetch job posts
  const [posts, postsError, postsStatus] = await prismaHandle(
    prisma.$transaction([
      prisma.job.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where: {
          AND: [
            {
              companyId: req.params.id,
            },
            {
              visible: true,
            },
            {
              expiredAt: {
                gt: new Date(),
              },
            },
          ],
        },
        orderBy: {
          createAt: "desc",
        },
        select: {
          id: true,
          title: true,
          cities: {
            select: {
              id: true,
              name: true,
            },
          },
          updateAt: true,
          expiredAt: true,
          requirement: true,
          company: {
            select: {
              id: true,
              avatar: true,
              wallpaper: true,
              name: true,
            },
          },
          workTypes: true,
        },
      }),
      prisma.job.count({
        where: {
          AND: [
            {
              companyId: req.params.id,
            },
            {
              visible: true,
            },
            {
              expiredAt: {
                gt: new Date(),
              },
            },
          ],
        },
      }),
    ])
  );

  if (posts) {
    return res.status(200).json({ jobs: posts[0], totalCount: posts[1] });
  } else {
    return res.status(postsStatus).json({ message: postsError });
  }
};

//----------------------------------------------------------------------------------------------
// @desc Get list of cities
// @route POST /public/cities
// @access Public
const getCities = async (req, res) => {
  const { countryCode } = req.body;

  if (!countryCode) {
    res.status(400).json({ message: "Missing required field" });
  }

  const [cities, citiesError, citiesStatus] = await prismaHandle(
    prisma.city.findMany({
      where: {
        countryCode,
      },
      select: {
        id: true,
        name: true,
      },
    })
  );

  return !citiesError
    ? res.status(200).json(cities)
    : res.status(400).json({ message: "No city found with given country" });
};

//----------------------------------------------------------------------------------------------
// @desc Get list of districts
// @route POST /public/districts
// @access Public
const getDistricts = async (req, res) => {
  const { cityId } = req.body;

  if (!cityId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const [districts, districtsError, districtsStatus] = await prismaHandle(
    prisma.district.findMany({
      where: {
        cityId,
      },
      select: {
        id: true,
        name: true,
        cityId: true,
      },
    })
  );

  return !districtsError
    ? res.status(200).json(districts)
    : res.status(400).json({ message: "No district found with given city" });
};

//----------------------------------------------------------------------------------------------
// @desc Get list of business scale
// @route GET /public/scale
// @access Public
const getBusinessScale = async (req, res) => {
  return res.status(200).json(BusinessScale);
};

//----------------------------------------------------------------------------------------------
// @desc Get list of job type
// @route GET /public/jobTypes
// @access Public
const getJobTypes = async (req, res) => {
  const [jobTypes, jobTypesError, jobTypesStatus] = await prismaHandle(
    prisma.workType.findMany()
  );

  return !jobTypesError
    ? res.status(200).json(jobTypes)
    : res.status(jobTypesStatus).json({ message: jobTypesError });
};

//----------------------------------------------------------------------------------------------
// @desc Get list of currency
// @route GET /public/currency
// @access Public
const getCurrency = async (req, res) => {
  const [currency, currencyError, currencyStatus] = await prismaHandle(
    prisma.currency.findMany({ select: { id: true, name: true } })
  );

  return !currencyError
    ? res.status(200).json(currency)
    : res.status(currencyStatus).json({ message: currencyError });
};

module.exports = {
  getAllJobs,
  getJobInfo,
  getCompanyInfo,
  getCompanyJobs,
  getCities,
  getDistricts,
  getJobTypes,
  getBusinessScale,
  getCurrency,
};
