import jwt from "jsonwebtoken";
import Activity from "../models/ActivityLog.js";
import mongoose from "mongoose";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";

export function lookupIpGeo(ip) {
  if (!ip) return null;
  // geoip-lite expects IPv4 or IPv6, will return null for private/local (127.0.0.1)
  return geoip.lookup(ip);
}

// * Create short-live token

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15min",
  });
}

// * Create long-live token

export function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
}

// * Refresh cookies

export function refreshCookieOptions() {
  const isProd = process.env_NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
    domain: undefined,
  };
}

// * Handle error

export const handleError = (res, error, message) => {
  console.log(error.message);
  return res.status(400).json({ error: error.message, message });
};

// * Handle Success

export const success = (res, result) => {
  return res.status(200).json(result);
};

// * Create an activity

export const createActivity = async (data, req) => {
  try {
    // IP
    const ip = "190.70.54.229" || "181.32.156.242";

    // ^ getClientIp(req) || null --> reserved for production

    let geo = null;
    if (ip) {
      geo = lookupIpGeo(ip) || null;
    }

    const coordinates =
      Array.isArray(geo?.ll) && geo.ll.length === 2 ? geo.ll : undefined;

    const location = geo
      ? [geo.city, geo.country].filter(Boolean).join(`, ${geo.region}, `)
      : null;

    // User-Agent parsing
    const uaString = req?.headers?.["user-agent"] || "";
    let ua = {};
    try {
      ua = new UAParser(uaString).getResult();
    } catch {
      ua = {};
    }

    await Activity.create({
      ...data,
      ip,
      location,
      coordinates,
      translatedAction: translateActionType(data.action),
      browser: ua.browser?.name
        ? `${ua.browser.name}${
            ua.browser?.version ? ` ${ua.browser.version}` : ""
          }`
        : null,
      os: ua.os?.name
        ? `${ua.os.name}${ua.os?.version ? ` ${ua.os.version}` : ""}`
        : null,
      device: ua.device?.type || "desktop",
      geo: geo
        ? {
            city: geo.city ?? null,
            region: geo.region ?? null,
            country: geo.country ?? null,
            timezone: geo.timezone ?? null,
            source: geo.source ?? "local",
          }
        : null,
    });
  } catch (e) {
    console.log("createActivity error:", e);
  }
};

// * Create Activity Message

export function createActvityMessage(role, name, message) {
  return `${formatRole(role)} ${name} ${message}`;
}

// * Format role

function formatRole(role) {
  return {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
  }[role];
}

// * Generate Subject Code

export function generateSubjectCode() {
  let code = "S-";
  for (let i = 0; i < 10; i++) {
    let digit = Math.round(Math.random() * 9);
    code += digit;
  }
  return code;
}

// * Regex helpers to sanity queries

export function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildCiStartsWithRegex(q) {
  const escaped = escapeRegex(q.trim());
  return new RegExp(`^${escaped}`, "i");
}

// utils/http.ts
export const parseBool = (v) =>
  v === "true" ? true : v === "false" ? false : undefined;

export const toRegexTokens = (q) =>
  q
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

export const toObjectId = (v) =>
  typeof v === "string" && mongoose.Types.ObjectId.isValid(v)
    ? new mongoose.Types.ObjectId(v)
    : undefined;

// * Get user IP

export function getClientIp(req) {
  if (!req) return null; // ✅ prevent undefined access

  // If app.set('trust proxy') is configured correctly, req.ip is usually correct
  const cf = req.headers?.["cf-connecting-ip"];
  if (cf) return String(cf);

  const xff = req.headers?.["x-forwarded-for"];
  if (xff) {
    const parts = String(xff)
      .split(",")
      .map((s) => s.trim());
    if (parts.length) return parts[0];
  }

  if (req.ip) return req.ip;
  if (req.connection?.remoteAddress) return req.connection.remoteAddress;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  if (req.connection?.socket?.remoteAddress)
    return req.connection.socket.remoteAddress;

  return null;
}

// * Format action type

export function translateActionType(actionType) {
  const map = {
    // User
    LOGIN_SUCCESS: "User logged in successfully",
    LOGIN_FAILURE: "User login failed",
    PASSWORD_CHANGE: "User changed their password",
    CHANGE_ROLE: "User role was changed",
    CREATE_USER: "A new user was created",
    MODIFY_PROFILE: "User profile was modified",

    // Subject
    CREATE_SUBJECT: "A new subject was created",
    DELETE_ONE_SUBJECT: "A subject was deleted",
    DELETE_ALL_SUBJECTS: "All subjects were deleted",
    MODIFY_SUBJECT: "A subject was modified",
    CANCEL_SUBJECT: "A subject was cancelled",

    // Group
    CREATE_GROUP: "A new group was created",
    ADD_USER_TO_GROUP: "User(s) were added to a group",
    DELETE_GROUP: "A group was deleted",
    DELETE_ALL_GROUPS: "All groups were deleted",
    DELETE_USER: "User(s) were removed from a group",
    MODIFY_GROUP: "A group was modified",

    // Assessment
    CREATE_ASSESSMENT: "A new assessment was created",
    MODIFY_ASSESSMENT: "An assessment was modified",
    DELETE_ASSESSMENT: "An assessment was deleted",
    DELETE_ALL_ASSESSMENTS: "All assessments were deleted",

    // Grade
    CREATE_GRADE: "A new grade was created",
    MODIFY_GRADE: "A grade was modified",
    DELETE_GRADE: "A grade was deleted",
    DELETE_ALL_GRADES: "All grades were deleted",
  };

  return map[actionType] || "Unknown action";
}
