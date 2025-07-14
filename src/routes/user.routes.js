import express from "express";
import { loginuser, logoutuser, registeruser, refreshaccesstoken, changecurrentpassword, updateaccountdetails, updateuseravatar, updateusercoverimage, getwatchhistory } from "../controllers/user.controller.js"; 
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router(); 

router.post(
  "/register",
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverimage",
      maxCount: 1,
    },
  ]),
  registeruser
);

router.route("/login").post(loginuser)


router.route("/logout").post(verifyJWT, logoutuser )

router.route("/refresh-token").post(refreshaccesstoken)


router.route("/change-password").post(verifyJWT,changecurrentpassword)
router.route("/update-account").patch(verifyJWT,updateaccountdetails)

router.route("/avatar").post(verifyJWT,upload.single("avatar"),updateuseravatar)

router.route("/cover-image").patch(verifyJWT,upload.single("fcoverimage"),updateusercoverimage)

router.route("/c/:username").get(verifyJWT,getuserchannelprofile)

router.route("/history").get(verifyJWT,getwatchhistory)





 






export default router;
