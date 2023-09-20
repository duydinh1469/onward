const firebase = require("../firebase");
const { v4: uuid } = require("uuid");
const { format } = require("date-fns");

function firebaseDownloadURL(bucket, pathToFile, downloadToken) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    pathToFile
  )}?alt=media&token=${downloadToken}`;
}

function firebaseStorageFile(url) {
  const fileName = url?.split("/o/").pop().split("?alt")[0];
  return decodeURIComponent(fileName);
}

function firebaseUpload(fileArray, directory, customName) {
  if (!fileArray || !directory || (fileArray.length > 1 && customName))
    return [[], [], []];

  let urlArray = [];
  let pathArray = [];
  const promiseArray = fileArray.map((file) => {
    const firebaseDir = customName
      ? `${directory}${format(new Date(), "yyyyMMddHHmmss - ")}${customName}`
      : `${directory}${format(new Date(), "yyyyMMddHHmmss - ")}${
          file.originalname
        }`;
    const firebaseToken = uuid();
    const uploadFile = firebase.bucket.file(firebaseDir);
    urlArray = [
      ...urlArray,
      firebaseDownloadURL(
        process.env.FIREBASE_BUCKET,
        firebaseDir,
        firebaseToken
      ),
    ];
    pathArray = [...pathArray, firebaseDir];
    return uploadFile.save(file.buffer, {
      contentType: file.mimetype,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: firebaseToken,
        },
      },
    });
  });

  return [promiseArray, urlArray, pathArray];
}

function firebaseDelete(pathArray) {
  return pathArray.map((path) => {
    return firebase.bucket.file(path).delete({
      ignoreNotFound: true,
    });
  });
}

module.exports = {
  firebaseDownloadURL,
  firebaseStorageFile,
  firebaseUpload,
  firebaseDelete,
};
