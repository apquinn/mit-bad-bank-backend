import jwt from "jsonwebtoken";

export const authorizeRequest = (req, res, next) => {
  const tokenRaw = req.headers["authorization"];
  if (!tokenRaw) {
    return res.sendStatus(401);
  }
  const token = tokenRaw.split(" ")[1];
  if (!token) {
    return res.sendStatus(401);
  }
  jwt.verify(token, process.env.JWT_SECRET, (err) => {
    if (err) return res.sendStatus(401);
    next();
  });
};
