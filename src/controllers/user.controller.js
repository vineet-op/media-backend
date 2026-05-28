import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { fileUploadCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"

const registerUser = asyncHandler(async (req, res) => {

    const { username, email, password, fullName } = req.body

    if ([username, email, password, fullName].some((feild) => feild?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image Required")
    }

    const avatar = await fileUploadCloudinary(avatarLocalPath)
    const coverImage = await fileUploadCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "failed to register user")
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "user created successfully"))

})

export { registerUser }