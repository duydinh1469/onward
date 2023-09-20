-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'HR', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BusinessScale" AS ENUM ('MAX50', 'MAX100', 'MAX300', 'MAX500', 'NOMAX');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('VERIFIED', 'UNVERIFIED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "avatar" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "Role"[] DEFAULT ARRAY['CANDIDATE']::"Role"[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'UNVERIFIED',
    "scale" "BusinessScale" NOT NULL,
    "website" TEXT NOT NULL,
    "avatar" TEXT,
    "wallpaper" TEXT,
    "description" TEXT,
    "representer" TEXT,
    "mapLink" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1000,
    "loginDate" TIMESTAMP(3),
    "districtId" INTEGER NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyImage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "imageLink" TEXT NOT NULL,

    CONSTRAINT "CompanyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "cvLink" TEXT,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HR" (
    "id" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" TEXT NOT NULL,
    "managerId" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "HR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "minSalary" INTEGER,
    "maxSalary" INTEGER,
    "currencyId" INTEGER,
    "recruitAmount" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReported" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" TEXT NOT NULL,

    CONSTRAINT "JobReported_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportImage" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "imageLink" TEXT NOT NULL,

    CONSTRAINT "ReportImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneCode" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cityCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "districtCode" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "WorkType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_appliedJobs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_markedJobs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CandidateToCompany" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_HRToJob" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_JobToWorkType" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CityToJob" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JobReported_candidateId_jobId_key" ON "JobReported"("candidateId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkType_type_key" ON "WorkType"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_name_key" ON "Currency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_appliedJobs_AB_unique" ON "_appliedJobs"("A", "B");

-- CreateIndex
CREATE INDEX "_appliedJobs_B_index" ON "_appliedJobs"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_markedJobs_AB_unique" ON "_markedJobs"("A", "B");

-- CreateIndex
CREATE INDEX "_markedJobs_B_index" ON "_markedJobs"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CandidateToCompany_AB_unique" ON "_CandidateToCompany"("A", "B");

-- CreateIndex
CREATE INDEX "_CandidateToCompany_B_index" ON "_CandidateToCompany"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_HRToJob_AB_unique" ON "_HRToJob"("A", "B");

-- CreateIndex
CREATE INDEX "_HRToJob_B_index" ON "_HRToJob"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_JobToWorkType_AB_unique" ON "_JobToWorkType"("A", "B");

-- CreateIndex
CREATE INDEX "_JobToWorkType_B_index" ON "_JobToWorkType"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CityToJob_AB_unique" ON "_CityToJob"("A", "B");

-- CreateIndex
CREATE INDEX "_CityToJob_B_index" ON "_CityToJob"("B");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyImage" ADD CONSTRAINT "CompanyImage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HR" ADD CONSTRAINT "HR_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HR" ADD CONSTRAINT "HR_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "HR"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HR" ADD CONSTRAINT "HR_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReported" ADD CONSTRAINT "JobReported_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReported" ADD CONSTRAINT "JobReported_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImage" ADD CONSTRAINT "ReportImage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "JobReported"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_appliedJobs" ADD CONSTRAINT "_appliedJobs_A_fkey" FOREIGN KEY ("A") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_appliedJobs" ADD CONSTRAINT "_appliedJobs_B_fkey" FOREIGN KEY ("B") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_markedJobs" ADD CONSTRAINT "_markedJobs_A_fkey" FOREIGN KEY ("A") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_markedJobs" ADD CONSTRAINT "_markedJobs_B_fkey" FOREIGN KEY ("B") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CandidateToCompany" ADD CONSTRAINT "_CandidateToCompany_A_fkey" FOREIGN KEY ("A") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CandidateToCompany" ADD CONSTRAINT "_CandidateToCompany_B_fkey" FOREIGN KEY ("B") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HRToJob" ADD CONSTRAINT "_HRToJob_A_fkey" FOREIGN KEY ("A") REFERENCES "HR"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HRToJob" ADD CONSTRAINT "_HRToJob_B_fkey" FOREIGN KEY ("B") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobToWorkType" ADD CONSTRAINT "_JobToWorkType_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobToWorkType" ADD CONSTRAINT "_JobToWorkType_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CityToJob" ADD CONSTRAINT "_CityToJob_A_fkey" FOREIGN KEY ("A") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CityToJob" ADD CONSTRAINT "_CityToJob_B_fkey" FOREIGN KEY ("B") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

