const hrPrivilege = async (req, res, next) => {
  const { compVerified } = req.body;

  if (!compVerified) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Continue request
  next();
};

module.exports = hrPrivilege;
