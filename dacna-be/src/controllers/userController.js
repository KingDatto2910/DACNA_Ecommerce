import * as userModel from "../models/userModel.js";

/** Get current user's profile (requires auth) */
export async function getUserProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await userModel.getUserProfile(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get user profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Update current user's profile (requires auth) */
export async function updateUserProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const updates = {
      username: req.body.username,
      phone: req.body.phone,
      full_name: req.body.full_name,
      address_street: req.body.address_street,
      address_district: req.body.address_district,
      address_ward: req.body.address_ward,
      address_city: req.body.address_city,
      avatar_url: req.body.avatar_url,
    };

    // Check if any field is provided
    const hasUpdates = Object.values(updates).some((v) => v !== undefined);
    if (!hasUpdates) {
      return res.status(400).json({ error: "No fields to update" });
    }

    await userModel.updateUserProfile(userId, updates);

    return res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update user profile error:", error);
    // Handle unique constraint violations
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ error: "Username or phone already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

/* ========== ADMIN FUNCTIONS ========== */

/**
 * [POST] /api/users/admin
 * Create a new user (admin only)
 */
export async function createUser(req, res, next) {
  try {
    const {
      username,
      email,
      password,
      roles = "customer",
      verified = true,
      phone,
      full_name,
    } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: username, email, password",
      });
    }

    const bcrypt = (await import("bcrypt")).default;
    const hashed = await bcrypt.hash(password, 10);

    const userId = await userModel.createUserAdmin({
      username,
      email,
      pw: hashed,
      roles,
      verified,
      phone,
      full_name,
    });

    res.status(201).json({
      ok: true,
      message: "User created successfully",
      data: { userId },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ ok: false, message: "Email or phone already exists" });
    }
    next(err);
  }
}

/**
 * [GET] /api/users/admin
 * List all users with filters and pagination (admin only)
 */
export async function listAllUsers(req, res, next) {
  try {
    const result = await userModel.listAllUsers(req.query);

    res.json({
      ok: true,
      data: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * [GET] /api/users/admin/:id
 * Get user details by ID (admin only)
 */
export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const user = await userModel.getUserById(id);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * [PATCH] /api/users/admin/:id
 * Update user (admin only) - can change role, verified status
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { roles, verified, username, email, phone, full_name } = req.body;

    // Check if user exists
    const userExists = await userModel.getUserById(id);
    if (!userExists) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const updates = { roles, verified, username, email, phone, full_name };
    await userModel.updateUser(id, updates);

    res.json({ ok: true, message: "User updated successfully" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ ok: false, message: "Username or email already exists" });
    }
    next(err);
  }
}

/**
 * [DELETE] /api/users/admin/:id
 * Delete user (admin only)
 */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    // Check if user exists
    const userExists = await userModel.getUserById(id);
    if (!userExists) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    // Delete user (cascade will handle related data in most cases)
    await userModel.deleteUser(id);

    res.json({ ok: true, message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * [DELETE] /api/users/profile
 * Allow authenticated user to delete their own account
 */
export async function deleteOwnAccount(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Check if user exists and get email for response
    const user = await userModel.getUserProfile(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    // Delete user account (ON DELETE CASCADE will handle related data)
    await userModel.deleteOwnAccount(userId);

    res.json({
      ok: true,
      message: `Account ${user.email} has been permanently deleted`,
    });
  } catch (err) {
    console.error("Delete own account error:", err);
    next(err);
  }
}

/**
 * [POST] /api/users/set-password
 * Allow user (especially Google OAuth users) to set/update their password
 * Can work with or without authentication (for new Google users)
 */
export async function setPassword(req, res, next) {
  try {
    const { password, email, googleProfile } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Hash password
    const bcrypt = (await import("bcrypt")).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Case 1: Authenticated user updating password
    if (req.user?.id) {
      const userId = req.user.id;
      await userModel.setPassword(userId, hashedPassword);

      return res.json({
        ok: true,
        message: "Password set successfully",
      });
    }

    // Case 2: New Google user registering with password
    if (email && googleProfile) {
      const displayName = googleProfile.displayName ?? null;
      const avatarUrl = googleProfile.avatarUrl ?? null;
      const providerId = googleProfile.providerId ?? null;
      const username = email.split("@")[0];

      // Check if user already exists
      const existingUser = await userModel.userExistsByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          ok: false,
          message: "User already exists. Please login instead.",
        });
      }

      // Create new user with password
      const userId = await userModel.createGoogleUser({
        username,
        email,
        hashedPassword,
        displayName,
        avatarUrl,
        providerId,
      });

      // Get the newly created user
      const user = await userModel.getUserByEmail(email);

      if (!user) {
        return res.status(500).json({
          ok: false,
          message: "Failed to create user",
        });
      }

      // Generate JWT token
      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign(
        {
          userId: user.id ?? null,
          email: user.email ?? null,
          role: user.roles ?? "customer",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      return res.json({
        ok: true,
        message: "Account created successfully",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.roles,
        },
      });
    }

    return res.status(400).json({
      ok: false,
      message: "Missing required information",
    });
  } catch (err) {
    console.error("Set password error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        ok: false,
        message: "Email already registered",
      });
    }
    next(err);
  }
}
