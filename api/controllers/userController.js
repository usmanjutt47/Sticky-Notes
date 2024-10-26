const User = require("../model/userModel");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Note = require("../model/noteModel");

const generatePassword = () => {
  return crypto.randomBytes(4).toString("hex");
};

const register = async (req, res) => {
  const { email } = req.body;

  try {
    let user = await User.findOne({ email });

    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (user) {
      user.password = hashedPassword;
      await user.save();

      res.status(200).json({
        message: "Your password has been updated. Please check your email.",
      });
    } else {
      user = new User({ email, password: hashedPassword });
      await user.save();

      res.status(201).json({
        message: "User registered successfully. Please check your email.",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Sticky Notes Password",
      text: `Your password is: ${newPassword}`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    res.status(200).json({
      message: "Login successful",
      userId: user._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createNote = async (req, res) => {
  const { title, content, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const color = Note.schema.paths.color.defaultValue();

  try {
    const newNote = new Note({
      title,
      content,
      color,
      userId,
    });

    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserNotes = async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const notes = await Note.find({ userId });

    if (!notes || notes.length === 0) {
      return res.status(404).json({ message: "No notes found for this user." });
    }

    res.status(200).json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { register, login, getAllUsers, createNote, getUserNotes };
