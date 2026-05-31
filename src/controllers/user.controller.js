import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { fileUploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

//Register User
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, fullName } = req.body;

    if (
        [username, email, password, fullName].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with username or email already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image Required");
    }

    let coverImageLocalPath;

    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    const avatar = await fileUploadCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const coverImage = coverImageLocalPath
        ? await fileUploadCloudinary(coverImageLocalPath)
        : null;

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    if (!createdUser) {
        throw new ApiError(500, "failed to register user");
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "user created successfully"));
});

//Login User

const loginUser = asyncHandler(async (req, res) => {
    const { username, password, email } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError(400, "User with email and username not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect Password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id,
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User Logged in Successfully",
            ),
        );
});

//Logout User

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined,
        },
    });

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, "User Logout Successfully"));
});

//refreshAccessToken

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );

        const user = await User.findById(decodedToken?.id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }),
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Can't generate refresh Token");
    }
});

//Change Current Passeord

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user?.id);
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

        if (!isPasswordCorrect) {
            throw new ApiError(400, "Incorrect user password");
        }

        user.password = newPassword;
        await user.save({ validateBeforeSave: false });

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Password Change Successfully"));
    } catch (error) {
        throw new ApiError(404, error.message);
    }
});

// Get Current User

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200), req.user, "current user fetched successfully");
});

//update Account Details

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user?.id,
            {
                $set: {
                    fullName: fullName,
                    email: email,
                },
            },
            {
                new: true,
            },
        ).select("-password");

        return res
            .status(200)
            .json(new ApiResponse(200, user, "account details updated successfully"));
    } catch (error) {
        throw new ApiError(400, "cannot update account details");
    }
});


//update avatarImage

const updateAvatarImage = asyncHandler(async (req, res) => {
    const avatarImagePath = req.file?.path

    if (!avatarImagePath) {
        throw new ApiError(401, "avatar image not found")
    }

    try {
        const avatar = await fileUploadCloudinary(avatarImagePath)

        if (!avatar.url) {
            throw new ApiError(404, "failed to upload avatarImage")
        }

        const user = await User.findByIdAndUpdate(req.user?.id, {
            $set: {
                avatar: avatar
            }
        }, {
            new: true
        }).select("-password")

        return res.status(200).json(new ApiResponse(200, user, "avatar updated successfully"))
    } catch (error) {
        throw new ApiError(404, {}, "Something went wrong while updating the avatar")
    }

})

// updateCoverImage

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImagePath = req.file?.path

    if (!coverImagePath) {
        throw new ApiError(401, "avatar image not found")
    }

    try {
        const coverImage = await fileUploadCloudinary(coverImagePath)

        if (!coverImage.url) {
            throw new ApiError(404, "failed to upload avatarImage")
        }

        const user = await User.findByIdAndUpdate(req.user?.id, {
            $set: {
                coverImage: coverImage
            }
        }, {
            new: true
        }).select("-password")

        return res.status(200).json(new ApiResponse(200, user, "coverImage updated successfully"))

    } catch (error) {
        throw new ApiError(404, {}, "Something went wrong while updating the coverImage")
    }


})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatarImage,
    updateCoverImage
};
