import { apierror } from "../utils/apierror.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
import { user as User } from "../models/user.model.js"; // Fixed relative import

export const verifyJWT = asynchandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accesstoken ||
      req.header("authorization")?.replace(/Bearer\s?/i, "");

    if (!token) {
      throw new apierror(401, "Unauthorized request: Token missing");
    }

    const decodedtoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const foundUser = await User.findById(decodedtoken?._id).select(
      "-password -refreshtoken"
    );

    if (!foundUser) {
      throw new apierror(401, "Invalid access token");
    }

    req.user = foundUser;
    next();
  } catch (error) {
    return next(new apierror(401, "Unauthorized or invalid token"));
  }
});
