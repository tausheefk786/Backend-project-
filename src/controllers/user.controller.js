import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiresponse } from "../utils/apiresponse.js";
import { user as User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

// Helper: Generate access and refresh tokens
const generateaccessandrefreshtokens = async (userid) => {
    try {
        const existingUser = await User.findById(userid);
        const accesstoken = existingUser.generateaccesstoken();
        const refreshtoken = existingUser.generaterefreshtoken();

        existingUser.refreshtoken = refreshtoken;
        await existingUser.save({ validateBeforeSave: false });

        return { accesstoken, refreshtoken };
    } catch (error) {
        throw new apierror(500, "Something went wrong while generating tokens");
    }
};

// 1. Register
const registeruser = asynchandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    if ([fullname, email, username, password].some((f) => f?.trim() === "")) {
        throw new apierror(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username: username.toLowerCase() }, { email }],
    });

    if (existedUser) {
        throw new apierror(409, "User with email or username already exists");
    }

    const avatarlocalpath = req.files?.avatar?.[0]?.path;
    const coverimagelocalpath = req.files?.coverimage?.[0]?.path;

    if (!avatarlocalpath) {
        throw new apierror(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath);
    const coverimage = coverimagelocalpath
        ? await uploadOnCloudinary(coverimagelocalpath)
        : null;

    if (!avatar?.url) {
        throw new apierror(400, "Avatar upload failed");
    }

    const newUser = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(newUser._id).select("-password -refreshtoken");

    return res.status(201).json(new apiresponse(200, createdUser, "User registered successfully"));
});

// 2. Login
const loginuser = asynchandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!(username || email)) {
        throw new apierror(400, "Username or email is required");
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (!existingUser || !(await existingUser.ispasswordcorrect(password))) {
        throw new apierror(401, "Invalid user credentials");
    }

    const { accesstoken, refreshtoken } = await generateaccessandrefreshtokens(existingUser._id);
    const loggedInUser = await User.findById(existingUser._id).select("-password -refreshtoken");

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .cookie("accesstoken", accesstoken, options)
        .cookie("refreshtoken", refreshtoken, options)
        .json(
            new apiresponse(
                200,
                { user: loggedInUser, accesstoken, refreshtoken },
                "User logged in successfully"
            )
        );
});

// 3. Logout
const logoutuser = asynchandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshtoken: 1 } });

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .clearCookie("accesstoken", options)
        .clearCookie("refreshtoken", options)
        .json(new apiresponse(200, {}, "User logged out"));
});

// 4. Refresh Token
const refreshaccesstoken = asynchandler(async (req, res) => {
    const incomingrefreshtoken = req.cookies.refreshtoken || req.body.refreshtoken;

    if (!incomingrefreshtoken) {
        throw new apierror(401, "Unauthorized request");
    }

    try {
        const decoded = jwt.verify(incomingrefreshtoken, process.env.REFRESH_TOKEN_SECRET);
        const existingUser = await User.findById(decoded?._id);

        if (!existingUser || existingUser.refreshtoken !== incomingrefreshtoken) {
            throw new apierror(401, "Refresh token is invalid or expired");
        }

        const { accesstoken, refreshtoken: newrefreshtoken } = await generateaccessandrefreshtokens(existingUser._id);

        const options = { httpOnly: true, secure: true };

        return res
            .status(200)
            .cookie("accesstoken", accesstoken, options)
            .cookie("refreshtoken", newrefreshtoken, options)
            .json(
                new apiresponse(200, { accesstoken, refreshtoken: newrefreshtoken }, "Access token refreshed")
            );
    } catch (error) {
        throw new apierror(401, error?.message || "Invalid refresh token");
    }
});

// 5. Change Password
const changecurrentpassword = asynchandler(async (req, res) => {
    const { oldpassword, newpassword } = req.body;

    const currentUser = await User.findById(req.user?._id);
    const isCorrect = await currentUser.ispasswordcorrect(oldpassword);

    if (!isCorrect) {
        throw new apierror(400, "Invalid old password");
    }

    currentUser.password = newpassword;
    await currentUser.save({ validateBeforeSave: false });

    return res.status(200).json(new apiresponse(200, {}, "Password changed successfully"));
});

// 6. Update Account Details
const updateaccountdetails = asynchandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!(fullname || email)) {
        throw new apierror(400, "At least one field is required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullname, email } },
        { new: true }
    ).select("-password");

    return res.status(200).json(new apiresponse(200, updatedUser, "Account details updated successfully"));
});

// 7. Update Avatar
const updateuseravatar = asynchandler(async (req, res) => {
    const avatarlocalpath = req.files?.avatar?.[0]?.path;

    if (!avatarlocalpath) {
        throw new apierror(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath);
    if (!avatar?.url) {
        throw new apierror(400, "Avatar upload failed");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    return res.status(200).json(new apiresponse(200, updatedUser, "Avatar updated successfully"));
});

// 8. Update Cover Image
const updateusercoverimage = asynchandler(async (req, res) => {
    const coverimagelocalpath = req.files?.coverimage?.[0]?.path;

    if (!coverimagelocalpath) {
        throw new apierror(400, "Cover image file is missing");
    }

    const coverimage = await uploadOnCloudinary(coverimagelocalpath);
    if (!coverimage?.url) {
        throw new apierror(400, "Cover image upload failed");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { coverimage: coverimage.url } },
        { new: true }
    ).select("-password");

    return res.status(200).json(new apiresponse(200, updatedUser, "Cover image updated successfully"));
});

const getuserchannelprofile = asynchandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new apierror(400, "Username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedto"
            }
        },
        {
            $addFields: {
                subscriberscount: { $size: "$subscribers" },
                channelsubscribedtocount: { $size: "$subscribedto" },
                issubscribed: {
                    $cond: {
                        if: {
                            $in: [
                                req.user?._id,
                                { $map: { input: "$subscribers", as: "s", in: "$$s.subscriber" } }
                            ]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscriberscount: 1,
                channelsubscribedtocount: 1,
                issubscribed: 1,
                avatar: 1,
                coverimage: 1,
                email: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new apierror(404, "Channel does not exist");
    }

    return res
        .status(200)
        .json(new apiresponse(200, channel[0], "User channel fetched successfully"));
});

const getwatchhistory = asynchandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchhistory",
                foreignField: "_id",
                as: "watchhistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner"
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                            owner: {
                                fullname: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res.status(200).json(
        new apiresponse(
            200,
            user[0]?.watchhistory || [],
            "Watch history fetched successfully"
        )
    );
});




export {
    registeruser,
    loginuser,
    logoutuser,
    refreshaccesstoken,
    changecurrentpassword,
    updateaccountdetails,
    updateuseravatar,
    updateusercoverimage,
    getuserchannelprofile,
    getwatchhistory
};
