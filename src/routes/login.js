import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bc from "bcrypt";
import { Router } from "express";
import {
  createActivity,
  createActvityMessage,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  success,
} from "../lib/utils.js";
import { ACTIONS } from "../lib/constants.js";

const router = Router();

// * Login function

router.post("/login", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ message: "Id and password are required" });
    }

    const user = await User.findOne({ id }).lean();

    if (!user) {
      return res
        .status(401)
        .json({ message: "Incorrect document or password." });
    }

    if (user.status === "blocked") {
      return res
        .status(403)
        .json({ message: "Your account is currently blocked." });
    }

    const ok = user.needToChange
      ? user.id === user.password
      : await bc.compare(password, user.password);
    if (!ok) {
      return res
        .status(401)
        .json({ message: "Incorrect document or password." });
    }

    const accessToken = signAccessToken({
      _id: user._id,
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      needToChange: user.needToChange,
      status: user.status,
    });

    const refreshToken = signRefreshToken({
      _id: user._id,
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      needToChange: user.needToChange,
      status: user.status,
    });

    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    createActivity(
      {
        userId: user._id,
        role: user.role,
        action: ACTIONS.user.loginSuccess,
        description: createActvityMessage(
          user.role,
          user.firstName,
          "Loged in successfully."
        ),
        entity: "Users",
      },
      req
    );

    return success(res, { accessToken, needToChange: user.needToChange });
  } catch (error) {
    console.log("Login error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// * Refreshing token

router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ message: "Missing refresh token" });

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const accessToken = signAccessToken({
      _id: payload._id,
      id: payload.id,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      documentType: payload.documentType,
      needToChange: payload.needToChange,
      status: payload.status,
    });

    return res.status(200).json({ accessToken });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token", error });
  }
});

// * Logout function

router.post("/logout", async (_, res) => {
  try {
    res.clearCookie("refreshToken", refreshCookieOptions());
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
