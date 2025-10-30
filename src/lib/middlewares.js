import jwt from "jsonwebtoken";

export function validate(rolesOrArray, ...restRoles) {
  // Normalize to a flat array of roles
  const roles = Array.isArray(rolesOrArray)
    ? rolesOrArray
    : [rolesOrArray, ...restRoles];

  const allowed = roles.map((r) => String(r).toLowerCase().trim());

  return async (req, res, next) => {
    try {
      const auth = req.headers.authorization || "";

      if (!/^Bearer\s+/i.test(auth)) {
        return res
          .status(401)
          .json({ message: "Authorization token is required" });
      }

      const token = auth.split(/\s+/)[1];
      if (!token) {
        return res
          .status(401)
          .json({ message: "Authorization token is required" });
      }

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      if (payload.status === "blocked") {
        return res
          .status(403)
          .json({ message: "Your account is currently blocked." });
      }

      if (!payload || typeof payload !== "object") {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Expect a role on the payload
      const role = String(payload.role || "")
        .toLowerCase()
        .trim();
      if (!role) {
        return res
          .status(401)
          .json({ message: "Invalid token payload (missing role)" });
      }

      if (!allowed.includes(role)) {
        return res.status(403).json({
          message: "This action is forbidden with the current credentials",
        });
      }

      req.user = payload;

      next();
    } catch (error) {
      return res.status(401).json({
        message: "Invalid or expired token",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };
}
