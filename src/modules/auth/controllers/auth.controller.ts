import type { Request, Response } from "express";
import { getDB } from "../../../db/db.ts";
import bcrypt from "bcrypt";

export const viewLogin = async (req: Request, res: Response) => {
  // block if already logged in
  if (req.session && req.session.user) {
    return res.redirect("/");
  }

  return res.render("auth/views/login");
};

export const login = async (req: Request, res: Response) => {
  // block if already logged in
  if (req.session && req.session.user) {
    return res.redirect("/");
  }

  const { username, password } = req.body || {};

  const errorMessages: string[] = [];

  if (!username || username.trim() === "") {
    errorMessages.push("Username is required");
  }

  if (!password || password.trim() === "") {
    errorMessages.push("Password is required");
  }

  if (errorMessages.length > 0) {
    return res.render("auth/views/login", {
      error: errorMessages.join(", "),
    });
  }

  const db = getDB();

  try {
    const user: any = db
      .prepare(
        "SELECT id, username, email, password FROM user WHERE username = ?",
      )
      .get(username.trim());

    if (!user) {
      return res.render("auth/views/login", {
        error: "Invalid username or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("auth/views/login", {
        error: "Invalid username or password",
      });
    }

    db.prepare(
      `
  UPDATE user 
  SET last_logged_in = datetime('now') 
  WHERE id = ?
`,
    ).run(user.id);

    // create session
    req.session.user = {
      id: user.id,
      email: user.email,
    };

    return res.redirect("/");
  } catch (error: any) {
    return res.render("auth/views/login", {
      error: error.message || "Something went wrong",
    });
  }
};

export const viewRegister = async (_req: Request, res: Response) => {
  const db = getDB();
  const result: any = db.prepare("SELECT COUNT(id) as count FROM user").get();
  return res.render("auth/views/register", {
    isForbidden: result.count === 0 ? false : true,
  });
};

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body || {};

  // Collect errors as strings
  const errorMessages: string[] = [];

  if (!username || username.trim() === "") {
    errorMessages.push("Username is required");
  } else if (username.length < 3) {
    errorMessages.push("Username must be at least 3 characters");
  }

  if (!email || email.trim() === "") {
    errorMessages.push("Email is required");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorMessages.push("Invalid email format");
    }
  }

  if (!password || password.trim() === "") {
    errorMessages.push("Password is required");
  } else if (password.length < 6) {
    errorMessages.push("Password must be at least 6 characters");
  }

  // If any validation errors → join into single line
  if (errorMessages.length > 0) {
    return res.render("auth/views/register", {
      error: errorMessages.join(", "),
    });
  }

  const db = getDB();

  try {
    const result: any = db.prepare("SELECT COUNT(id) as count FROM user").get();

    if (result.count >= 1) {
      return res.render("auth/views/register", {
        isForbidden: true,
      });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    db.prepare(
      `
      INSERT INTO user (id, username, email, password, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `,
    ).run(crypto.randomUUID(), username.trim(), email.trim(), hashedPass);

    return res.render("auth/views/register", {
      success: "User created successfully",
    });
  } catch (error: any) {
    return res.render("auth/views/register", {
      error: error.message || "Something went wrong",
    });
  }
};
