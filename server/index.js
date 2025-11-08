import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { User } from "./models/userModel.js";
import { Group } from "./models/groupModel.js";
import { Task } from "./models/taskModel.js";
import { Comment } from "./models/commentModel.js";
import { Conversation } from "./models/conversationModel.js";
import { Message } from "./models/messageModel.js";
import { Notification } from "./models/notificationModel.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5555;
const mongoDBURL = process.env.MONGO_URL;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// Helper function to log activity
const logActivity = async (taskId, userId, type, description, metadata = {}) => {
  try {
    const task = await Task.findById(taskId);
    if (!task) return;
    
    task.activityLog.push({
      type,
      user: userId,
      description,
      metadata,
      timestamp: new Date(),
    });
    
    await task.save();
  } catch (error) {
    console.error("Error logging activity:", error.message);
  }
};

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Helper function to calculate task progress including subtasks
const calculateTaskProgress = async (task) => {
  let checklistProgress = 0;
  let subtaskProgress = 0;
  let hasChecklist = false;
  let hasSubtasks = false;

  // Calculate checklist progress
  if (task.checklist && task.checklist.length > 0) {
    hasChecklist = true;
    const completedCount = task.checklist.filter(item => item.isCompleted).length;
    checklistProgress = Math.round((completedCount / task.checklist.length) * 100);
  }

  // Calculate subtasks progress
  if (task.subtasks && task.subtasks.length > 0) {
    hasSubtasks = true;
    const subtasksData = await Task.find({ _id: { $in: task.subtasks } });
    if (subtasksData.length > 0) {
      const totalSubtaskProgress = subtasksData.reduce((sum, subtask) => sum + (subtask.progressPercentage || 0), 0);
      subtaskProgress = Math.round(totalSubtaskProgress / subtasksData.length);
    }
  }

  // If both exist, calculate weighted average (50% each)
  if (hasChecklist && hasSubtasks) {
    return Math.round((checklistProgress * 0.5) + (subtaskProgress * 0.5));
  }
  // If only checklist exists
  else if (hasChecklist) {
    return checklistProgress;
  }
  // If only subtasks exist
  else if (hasSubtasks) {
    return subtaskProgress;
  }
  // If neither exists
  return 0;
};

// Helper function to update parent task progress when subtask changes
const updateParentTaskProgress = async (taskId) => {
  const task = await Task.findById(taskId);
  if (task && task.parentTask) {
    const parentTask = await Task.findById(task.parentTask);
    if (parentTask) {
      parentTask.progressPercentage = await calculateTaskProgress(parentTask);
      await parentTask.save();
      // Recursively update if parent also has a parent
      if (parentTask.parentTask) {
        await updateParentTaskProgress(parentTask._id);
      }
    }
  }
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const updateUserStats = async (userId) => {
  const user = await User.findById(userId);
  const tasksCompleted = await Task.countDocuments({
    assignedTo: userId,
    status: "Completed"
  });
  const tasksInProgress = await Task.countDocuments({
    assignedTo: userId,
    status: "In Progress"
  });
  const now = new Date();
  const tasksOverdue = await Task.countDocuments({
    assignedTo: userId,
    status: { $nin: ["Completed", "Cancelled"] },
    dueDate: { $lt: now }
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  let currentStreak = user.stats.currentStreak || 0;
  if (user.stats.lastTaskCompletedDate) {
    const lastCompletedDate = new Date(user.stats.lastTaskCompletedDate);
    lastCompletedDate.setHours(0, 0, 0, 0);
    if (lastCompletedDate.getTime() === today.getTime()) {
    } else if (lastCompletedDate.getTime() === yesterday.getTime()) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }
  const longestStreak = Math.max(currentStreak, user.stats.longestStreak || 0);
  user.stats = {
    tasksCompleted,
    tasksInProgress,
    tasksOverdue,
    currentStreak,
    longestStreak,
    lastTaskCompletedDate: new Date()
  };
  await user.save();
};
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department } = req.body;
    if (!email || !password || !firstName || !lastName || !role || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      department
    });
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    const userResponse = user.toObject();
    delete userResponse.password;
    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: userResponse
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    user.lastSeen = new Date();
    await user.save();
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    const userResponse = user.toObject();
    delete userResponse.password;
    return res.status(200).json({
      message: "Login successful",
      token,
      user: userResponse
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/user/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("groups", "name department");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.put("/user/:id", verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, status, bio, phoneNumber, department } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, status, bio, phoneNumber, department },
      { new: true }
    ).select("-password");
    return res.status(200).json({
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/user/:id/upload-photo", verifyToken, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const result = await uploadToCloudinary(req.file.buffer, "task-management/profiles");
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { profilePhoto: result.secure_url },
      { new: true }
    ).select("-password");
    return res.status(200).json({
      message: "Profile photo uploaded successfully",
      user
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/user/:id/stats", verifyToken, async (req, res) => {
  try {
    await updateUserStats(req.params.id);
    const user = await User.findById(req.params.id).select("stats");
    return res.status(200).json(user.stats);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/users/search", verifyToken, async (req, res) => {
  try {
    const { query, department, role } = req.query;
    let searchQuery = {};
    if (query) {
      searchQuery.$or = [
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ];
    }
    if (department) {
      searchQuery.department = department;
    }
    if (role) {
      searchQuery.role = role;
    }
    const users = await User.find(searchQuery)
      .select("-password")
      .limit(20);
    return res.status(200).json(users);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/group/create", verifyToken, async (req, res) => {
  try {
    const { name, description, department, members, leader } = req.body;
    const group = await Group.create({
      name,
      description,
      department,
      members,
      leader,
      createdBy: req.userId
    });
    await User.updateMany(
      { _id: { $in: members } },
      { $push: { groups: group._id } }
    );
    const populatedGroup = await Group.findById(group._id)
      .populate("members", "firstName lastName profilePhoto role")
      .populate("leader", "firstName lastName profilePhoto role");
    return res.status(201).json({
      message: "Group created successfully",
      group: populatedGroup
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/groups", verifyToken, async (req, res) => {
  try {
    const { department } = req.query;
    let query = { isActive: true };
    if (department) {
      query.department = department;
    }
    const groups = await Group.find(query)
      .populate("members", "firstName lastName profilePhoto role")
      .populate("leader", "firstName lastName profilePhoto role")
      .sort({ createdAt: -1 });
    return res.status(200).json(groups);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/group/:id", verifyToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "firstName lastName profilePhoto role department")
      .populate("leader", "firstName lastName profilePhoto role")
      .populate("createdBy", "firstName lastName");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    group.members = group.members.filter(member => member != null);
    return res.status(200).json(group);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/tasks/group/:groupId", verifyToken, async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    let query = {
      assignedGroups: req.params.groupId,
      isArchived: false
    };
    
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }
    
    const tasks = await Task.find(query)
      .sort({ dueDate: 1 })
      .populate("createdBy", "firstName lastName profilePhoto role")
      .populate("assignedTo", "firstName lastName profilePhoto role")
      .populate("assignedGroups", "name department _id")
      .populate({
        path: "subtasks",
        populate: {
          path: "assignedTo",
          select: "firstName lastName profilePhoto"
        }
      });
    
    return res.status(200).json(tasks);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/group/:id/add-member", verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: userId } },
      { new: true }
    ).populate("members", "firstName lastName profilePhoto role");
    await User.findByIdAndUpdate(userId, {
      $addToSet: { groups: req.params.id }
    });
    await Notification.create({
      recipient: userId,
      sender: req.userId,
      type: "group_added",
      message: `You have been added to group: ${group.name}`
    });
    return res.status(200).json({
      message: "Member added successfully",
      group
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/group/:id/remove-member", verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: userId } },
      { new: true }
    );
    await User.findByIdAndUpdate(userId, {
      $pull: { groups: req.params.id }
    });
    return res.status(200).json({
      message: "Member removed successfully",
      group
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/task/create", verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      color,
      department,
      assignedTo,
      assignedGroups,
      dueDate,
      startDate,
      parentTask,
      isOpenForClaims,
      tags,
      checklist
    } = req.body;
    // Calculate initial progress percentage based on checklist
    let progressPercentage = 0;
    if (checklist && checklist.length > 0) {
      const completedCount = checklist.filter(item => item.isCompleted).length;
      progressPercentage = Math.round((completedCount / checklist.length) * 100);
    }

    const task = await Task.create({
      title,
      description,
      status: status || "Open",
      priority: priority || "Medium",
      color: color || "#3B82F6",
      department,
      createdBy: req.userId,
      assignedTo: assignedTo || [],
      assignedGroups: assignedGroups || [],
      dueDate,
      startDate: startDate || new Date(),
      parentTask: parentTask || null,
      isOpenForClaims: isOpenForClaims || false,
      tags: tags || [],
      checklist: checklist || [],
      progressPercentage: progressPercentage,
      activityLog: [{
        type: "created",
        user: req.userId,
        description: "Task created",
        metadata: { 
          status: status || "Open",
          priority: priority || "Medium",
        },
        timestamp: new Date(),
      }],
    });
    if (parentTask) {
      await Task.findByIdAndUpdate(parentTask, {
        $push: { subtasks: task._id }
      });
    }
    if (assignedTo && assignedTo.length > 0) {
      for (const userId of assignedTo) {
        if (userId !== req.userId) {
          await Notification.create({
            recipient: userId,
            sender: req.userId,
            type: "task_assigned",
            task: task._id,
            message: `You have been assigned to task: ${title}`
          });
        }
      }
    }
    const populatedTask = await Task.findById(task._id)
      .populate("createdBy", "firstName lastName profilePhoto role")
      .populate("assignedTo", "firstName lastName profilePhoto role department")
      .populate("assignedGroups", "name department");
    return res.status(201).json({
      message: "Task created successfully",
      task: populatedTask
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/tasks/feed", verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const user = await User.findById(req.userId);
    const tasks = await Task.find({
      isOpenForClaims: true,
      isClaimed: false,
      department: user.department,
      isArchived: false,
      status: { $nin: ["Completed", "Cancelled"] }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "firstName lastName profilePhoto role")
      .populate("assignedTo", "firstName lastName profilePhoto")
      .populate("assignedGroups", "name");
    return res.status(200).json({
      tasks,
      page,
      hasMore: tasks.length === limit
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/tasks/user/:userId", verifyToken, async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = {
      assignedTo: req.params.userId,
      isArchived: false,
      parentTask: null 
    };
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }
    const tasks = await Task.find(query)
      .sort({ dueDate: 1 })
      .populate("createdBy", "firstName lastName profilePhoto role")
      .populate("assignedTo", "firstName lastName profilePhoto role")
      .populate("assignedGroups", "name department")
      .populate({
        path: "subtasks",
        populate: {
          path: "assignedTo",
          select: "firstName lastName profilePhoto"
        }
      });
    return res.status(200).json(tasks);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/tasks/created-by/:userId", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({
      createdBy: req.params.userId,
      isArchived: false,
      parentTask: null
    })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "firstName lastName profilePhoto role")
      .populate("assignedGroups", "name department")
      .populate({
        path: "subtasks",
        populate: {
          path: "assignedTo",
          select: "firstName lastName profilePhoto"
        }
      });
    return res.status(200).json(tasks);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/task/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("createdBy", "firstName lastName profilePhoto role department")
      .populate("assignedTo", "firstName lastName profilePhoto role department")
      .populate("assignedGroups", "name department members")
      .populate("parentTask", "title status")
      .populate({
        path: "subtasks",
        populate: [
          { path: "assignedTo", select: "firstName lastName profilePhoto role" },
          { path: "createdBy", select: "firstName lastName profilePhoto" }
        ]
      })
      .populate("claimedBy", "firstName lastName profilePhoto")
      .populate("invitations.user", "firstName lastName profilePhoto role")
      .populate("invitations.invitedBy", "firstName lastName profilePhoto")
      .populate("attachments.uploadedBy", "firstName lastName profilePhoto");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    return res.status(200).json(task);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.put("/task/:id", verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      color,
      dueDate,
      progressPercentage,
      tags
    } = req.body;
    
    // Get old task for comparison
    const oldTask = await Task.findById(req.params.id);
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (color) updateData.color = color;
    if (dueDate) updateData.dueDate = dueDate;
    if (progressPercentage !== undefined) updateData.progressPercentage = progressPercentage;
    if (tags) updateData.tags = tags;
    if (status === "Completed") {
      updateData.completedDate = new Date();
      for (const userId of oldTask.assignedTo) {
        await updateUserStats(userId);
      }
    }
    
    // Log changes
    const activities = [];
    
    if (status && status !== oldTask.status) {
      activities.push({
        type: "status_changed",
        user: req.userId,
        description: `Status changed from ${oldTask.status} to ${status}`,
        metadata: { from: oldTask.status, to: status },
        timestamp: new Date(),
      });
    }
    
    if (priority && priority !== oldTask.priority) {
      activities.push({
        type: "priority_changed",
        user: req.userId,
        description: `Priority changed from ${oldTask.priority} to ${priority}`,
        metadata: { from: oldTask.priority, to: priority },
        timestamp: new Date(),
      });
    }
    
    if (title && title !== oldTask.title) {
      activities.push({
        type: "title_changed",
        user: req.userId,
        description: `Title changed from "${oldTask.title}" to "${title}"`,
        metadata: { from: oldTask.title, to: title },
        timestamp: new Date(),
      });
    }
    
    if (description && description !== oldTask.description) {
      activities.push({
        type: "description_changed",
        user: req.userId,
        description: "Description updated",
        metadata: {},
        timestamp: new Date(),
      });
    }
    
    if (dueDate && new Date(dueDate).getTime() !== new Date(oldTask.dueDate).getTime()) {
      activities.push({
        type: "due_date_changed",
        user: req.userId,
        description: `Due date changed`,
        metadata: { from: oldTask.dueDate, to: dueDate },
        timestamp: new Date(),
      });
    }
    
    if (activities.length > 0) {
      updateData.$push = { activityLog: { $each: activities } };
    }
    
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate("createdBy", "firstName lastName profilePhoto")
      .populate("assignedTo", "firstName lastName profilePhoto role")
      .populate("assignedGroups", "name");
    return res.status(200).json({
      message: "Task updated successfully",
      task
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/task/:id/assign", verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { 
        $addToSet: { assignedTo: userId },
        $push: {
          activityLog: {
            type: "assigned",
            user: req.userId,
            description: "User assigned to task",
            metadata: { assignedUser: userId },
            timestamp: new Date(),
          }
        }
      },
      { new: true }
    ).populate("assignedTo", "firstName lastName profilePhoto role");
    await Notification.create({
      recipient: userId,
      sender: req.userId,
      type: "task_assigned",
      task: task._id,
      message: `You have been assigned to task: ${task.title}`
    });
    return res.status(200).json({
      message: "User assigned to task",
      task
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/task/:id/unassign", verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { 
        $pull: { assignedTo: userId },
        $push: {
          activityLog: {
            type: "unassigned",
            user: req.userId,
            description: "User unassigned from task",
            metadata: { unassignedUser: userId },
            timestamp: new Date(),
          }
        }
      },
      { new: true }
    );
    return res.status(200).json({
      message: "User removed from task",
      task
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.put("/task/:id/reassign", verifyToken, async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.reassignCount >= 3) {
      return res.status(400).json({ message: "Task has reached maximum reassign limit (3)" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.department !== task.department) {
      return res.status(400).json({ message: "User must be in the same department" });
    }

    if (task.assignedTo.some(id => id.toString() === userId)) {
      return res.status(400).json({ message: "User is already assigned to this task" });
    }

    task.reassignHistory.push({
      reassignedBy: req.userId,
      reassignedTo: userId,
      reassignedAt: new Date(),
      reason: reason || "",
    });

    task.assignedTo = [userId];
    task.reassignCount += 1;

    task.activityLog.push({
      type: "reassigned",
      user: req.userId,
      description: `Reassigned task to ${targetUser.firstName} ${targetUser.lastName}`,
      metadata: { 
        reassignedTo: userId,
        reason: reason || "",
        reassignCount: task.reassignCount 
      },
      timestamp: new Date(),
    });

    await task.save();

    await Notification.create({
      recipient: userId,
      sender: req.userId,
      type: "task_assigned",
      task: task._id,
      message: `You have been reassigned to task: ${task.title}`,
    });

    await task.populate("assignedTo", "firstName lastName email profilePhoto role department");
    await task.populate("reassignHistory.reassignedBy", "firstName lastName email");
    await task.populate("reassignHistory.reassignedTo", "firstName lastName email");

    return res.status(200).json({
      message: "Task reassigned successfully",
      task,
      reassignsRemaining: 3 - task.reassignCount,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.get("/task/:id/available-assignees", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const availableUsers = await User.find({
      department: task.department,
      _id: { $nin: task.assignedTo },
    })
      .select("firstName lastName email profilePhoto role department")
      .limit(50);

    return res.status(200).json(availableUsers);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.put("/task/:id/assign-to-me", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedGroups", "name");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.assignedTo.some(user => user._id.toString() === req.userId)) {
      return res.status(400).json({ message: "You are already assigned to this task" });
    }

    const hasGroupAssignment = task.assignedGroups && task.assignedGroups.length > 0;
    
    if (!hasGroupAssignment) {
      return res.status(400).json({ 
        message: "This task must have a group assignment to be self-assigned" 
      });
    }

    const user = await User.findById(req.userId).populate("groups");
    const userGroupIds = user.groups.map(g => g._id.toString());
    const taskGroupIds = task.assignedGroups.map(g => g._id.toString());
    
    const isInAssignedGroup = userGroupIds.some(ugId => taskGroupIds.includes(ugId));
    
    if (!isInAssignedGroup) {
      return res.status(403).json({ 
        message: "You must be a member of one of the assigned groups to take this task" 
      });
    }

    task.assignedTo.push(req.userId);
    
    task.activityLog.push({
      type: "self_assigned",
      user: req.userId,
      description: "Assigned themselves to the task",
      metadata: {},
      timestamp: new Date(),
    });
    
    await task.save();

    await Notification.create({
      recipient: task.createdBy,
      sender: req.userId,
      type: "task_assigned",
      task: task._id,
      message: `assigned themselves to task: ${task.title}`
    });

    await task.populate("assignedTo", "firstName lastName email profilePhoto role department");

    return res.status(200).json({
      message: "Successfully assigned task to yourself",
      task
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

// Assign task to someone else when it has group assignment
app.put("/task/:id/assign-user", verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedGroups", "name");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.assignedTo.some(user => user._id.toString() === userId)) {
      return res.status(400).json({ message: "User is already assigned to this task" });
    }

    const hasGroupAssignment = task.assignedGroups && task.assignedGroups.length > 0;
    
    if (!hasGroupAssignment) {
      return res.status(400).json({ 
        message: "This task must have a group assignment to assign to group members" 
      });
    }

    const currentUser = await User.findById(req.userId).populate("groups");
    const currentUserGroupIds = currentUser.groups.map(g => g._id.toString());
    const taskGroupIds = task.assignedGroups.map(g => g._id.toString());
    
    const currentUserInGroup = currentUserGroupIds.some(ugId => taskGroupIds.includes(ugId));
    
    if (!currentUserInGroup) {
      return res.status(403).json({ 
        message: "You must be a member of one of the assigned groups to assign this task" 
      });
    }

    const targetUser = await User.findById(userId).populate("groups");
    
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const targetUserGroupIds = targetUser.groups.map(g => g._id.toString());
    const targetUserInGroup = targetUserGroupIds.some(ugId => taskGroupIds.includes(ugId));
    
    if (!targetUserInGroup) {
      return res.status(403).json({ 
        message: "Target user must be a member of one of the assigned groups" 
      });
    }

    task.assignedTo.push(userId);
    
    task.activityLog.push({
      type: "assigned",
      user: req.userId,
      description: `Assigned ${targetUser.firstName} ${targetUser.lastName} to the task`,
      metadata: { assignedUser: userId },
      timestamp: new Date(),
    });
    
    await task.save();

    await Notification.create({
      recipient: userId,
      sender: req.userId,
      type: "task_assigned",
      task: task._id,
      message: `assigned you to task: ${task.title}`
    });

    if (task.createdBy.toString() !== req.userId) {
      await Notification.create({
        recipient: task.createdBy,
        sender: req.userId,
        type: "task_assigned",
        task: task._id,
        message: `assigned ${targetUser.firstName} ${targetUser.lastName} to task: ${task.title}`
      });
    }

    await task.populate("assignedTo", "firstName lastName email profilePhoto role department");

    return res.status(200).json({
      message: "Successfully assigned task to user",
      task
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.get("/task/:id/available-group-members", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "_id")
      .populate("assignedGroups", "_id");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.assignedGroups || task.assignedGroups.length === 0) {
      return res.status(400).json({ 
        message: "This task does not have group assignments" 
      });
    }

    const groupIds = task.assignedGroups.map(g => g._id);
    const assignedUserIds = task.assignedTo.map(u => u._id.toString());

    const availableUsers = await User.find({
      groups: { $in: groupIds },
      _id: { $nin: assignedUserIds }
    })
      .select("firstName lastName email profilePhoto role department")
      .limit(50);

    return res.status(200).json(availableUsers);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post("/task/:id/claim", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task.isOpenForClaims) {
      return res.status(400).json({ message: "This task is not open for claims" });
    }
    if (task.isClaimed) {
      return res.status(400).json({ message: "This task has already been claimed" });
    }
    task.isClaimed = true;
    task.claimedBy = req.userId;
    task.claimedAt = new Date();
    task.assignedTo.push(req.userId);
    await task.save();
    await Notification.create({
      recipient: task.createdBy,
      sender: req.userId,
      type: "task_assigned",
      task: task._id,
      message: `claimed your task: ${task.title}`
    });
    return res.status(200).json({
      message: "Task claimed successfully",
      task
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/task/:id/invite", verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const task = await Task.findById(req.params.id);
    const alreadyInvited = task.invitations.some(
      inv => inv.user.toString() === userId && inv.status === "Pending"
    );
    if (alreadyInvited) {
      return res.status(400).json({ message: "User already has a pending invitation" });
    }
    task.invitations.push({
      user: userId,
      invitedBy: req.userId,
      status: "Pending"
    });
    await task.save();
    await Notification.create({
      recipient: userId,
      sender: req.userId,
      type: "task_invitation",
      task: task._id,
      message: `invited you to help with task: ${task.title}`
    });
    return res.status(200).json({
      message: "Invitation sent successfully"
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/task/:id/invitation-response", verifyToken, async (req, res) => {
  try {
    const { accept } = req.body; 
    const task = await Task.findById(req.params.id);
    const invitation = task.invitations.find(
      inv => inv.user.toString() === req.userId && inv.status === "Pending"
    );
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    invitation.status = accept ? "Accepted" : "Declined";
    invitation.respondedAt = new Date();
    if (accept) {
      if (!task.assignedTo.includes(req.userId)) {
        task.assignedTo.push(req.userId);
      }
    }
    await task.save();
    return res.status(200).json({
      message: accept ? "Invitation accepted" : "Invitation declined",
      task
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/task/:id/upload", verifyToken, upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const task = await Task.findById(req.params.id);
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer, "task-management/attachments");
      task.attachments.push({
        url: result.secure_url,
        publicId: result.public_id,
        fileName: file.originalname,
        uploadedBy: req.userId
      });
    }
    await task.save();
    return res.status(200).json({
      message: "Files uploaded successfully",
      attachments: task.attachments
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.delete("/task/:taskId/attachment/:attachmentId", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    const attachment = task.attachments.id(req.params.attachmentId);
    if (attachment) {
      await cloudinary.uploader.destroy(attachment.publicId);
      attachment.remove();
      await task.save();
    }
    return res.status(200).json({ message: "Attachment deleted successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.put("/task/:id/archive", verifyToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { isArchived: true },
      { new: true }
    );
    return res.status(200).json({
      message: "Task archived successfully",
      task
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.delete("/task/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const deleteSubtasks = async (taskId) => {
      const task = await Task.findById(taskId);
      if (task && task.subtasks.length > 0) {
        for (const subtaskId of task.subtasks) {
          await deleteSubtasks(subtaskId);
        }
      }
      await Task.findByIdAndDelete(taskId);
      await Comment.deleteMany({ task: taskId });
    };
    await deleteSubtasks(req.params.id);
    return res.status(200).json({ message: "Task and all subtasks deleted successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/task/:id/subtasks", verifyToken, async (req, res) => {
  try {
    const subtasks = await Task.find({ parentTask: req.params.id })
      .populate("createdBy", "firstName lastName profilePhoto")
      .populate("assignedTo", "firstName lastName profilePhoto role")
      .sort({ createdAt: -1 });
    return res.status(200).json(subtasks);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post("/task/:id/subtask", verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Subtask title is required" });
    }

    const parentTask = await Task.findById(req.params.id);
    if (!parentTask) {
      return res.status(404).json({ message: "Parent task not found" });
    }

    const subtask = await Task.create({
      title: title.trim(),
      description: `Subtask of: ${parentTask.title}`,
      department: parentTask.department,
      createdBy: req.userId,
      parentTask: parentTask._id,
      dueDate: parentTask.dueDate,
      startDate: new Date(),
      status: "Open",
      priority: "Medium",
      color: parentTask.color || "#3B82F6",
    });

    parentTask.subtasks.push(subtask._id);
    await parentTask.save();

    const populatedSubtask = await Task.findById(subtask._id)
      .populate("createdBy", "firstName lastName profilePhoto role")
      .populate("assignedTo", "firstName lastName profilePhoto role");

    return res.status(201).json({
      message: "Subtask created successfully",
      subtask: populatedSubtask,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post("/task/:id/subtask/link", verifyToken, async (req, res) => {
  try {
    const { subtaskId } = req.body;
    if (!subtaskId) {
      return res.status(400).json({ message: "Subtask ID is required" });
    }

    const parentTask = await Task.findById(req.params.id);
    if (!parentTask) {
      return res.status(404).json({ message: "Parent task not found" });
    }

    const subtask = await Task.findById(subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: "Task to link not found" });
    }

    if (parentTask._id.toString() === subtask._id.toString()) {
      return res.status(400).json({ message: "Cannot link a task to itself" });
    }

    if (subtask.subtasks && subtask.subtasks.includes(parentTask._id)) {
      return res.status(400).json({ message: "Cannot create circular dependency" });
    }

    if (subtask.parentTask) {
      return res.status(400).json({ message: "Task already has a parent task" });
    }

    subtask.parentTask = parentTask._id;
    await subtask.save();

    if (!parentTask.subtasks.includes(subtask._id)) {
      parentTask.subtasks.push(subtask._id);
    }

    parentTask.progressPercentage = await calculateTaskProgress(parentTask);
    await parentTask.save();

    const populatedSubtask = await Task.findById(subtask._id)
      .populate("createdBy", "firstName lastName profilePhoto role")
      .populate("assignedTo", "firstName lastName profilePhoto role");

    return res.status(200).json({
      message: "Task linked as subtask successfully",
      subtask: populatedSubtask,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.get("/task/:id/available-subtasks", verifyToken, async (req, res) => {
  try {
    const parentTask = await Task.findById(req.params.id);
    if (!parentTask) {
      return res.status(404).json({ message: "Task not found" });
    }


    const availableTasks = await Task.find({
      _id: { $ne: req.params.id },
      parentTask: null,
      department: parentTask.department,
    })
      .populate("createdBy", "firstName lastName profilePhoto")
      .populate("assignedTo", "firstName lastName profilePhoto")
      .select("title description status priority progressPercentage assignedTo createdBy dueDate")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json(availableTasks);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/task/:parentId/subtask/:subtaskId/unlink", verifyToken, async (req, res) => {
  try {
    const parentTask = await Task.findById(req.params.parentId);
    if (!parentTask) {
      return res.status(404).json({ message: "Parent task not found" });
    }

    const subtask = await Task.findById(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    subtask.parentTask = null;
    await subtask.save();

    parentTask.subtasks = parentTask.subtasks.filter(
      id => id.toString() !== subtask._id.toString()
    );

    parentTask.progressPercentage = await calculateTaskProgress(parentTask);
    await parentTask.save();

    return res.status(200).json({
      message: "Subtask unlinked successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post("/task/:id/checklist/add", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Checklist item text is required" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.checklist) {
      task.checklist = [];
    }

    task.checklist.push({
      text: text.trim(),
      isCompleted: false,
      createdAt: new Date(),
    });

    task.progressPercentage = await calculateTaskProgress(task);
    await task.save();

    await updateParentTaskProgress(task._id);

    return res.status(200).json({
      message: "Checklist item added successfully",
      task,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.put("/task/:taskId/checklist/:itemId/toggle", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.checklist) {
      task.checklist = [];
    }

    if (task.checklist.length === 0) {
      return res.status(404).json({ message: "Checklist is empty" });
    }

    const item = task.checklist.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    item.isCompleted = !item.isCompleted;
    item.completedAt = item.isCompleted ? new Date() : null;
    item.completedBy = item.isCompleted ? req.userId : null;

    task.progressPercentage = await calculateTaskProgress(task);
    await task.save();

    // Update parent task progress if this is a subtask
    await updateParentTaskProgress(task._id);

    return res.status(200).json({
      message: "Checklist item updated successfully",
      task,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/task/:taskId/checklist/:itemId", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.checklist) {
      task.checklist = [];
    }

    if (task.checklist.length === 0) {
      return res.status(404).json({ message: "Checklist is empty" });
    }

    const itemExists = task.checklist.id(req.params.itemId);
    if (!itemExists) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    task.checklist.pull(req.params.itemId);

    task.progressPercentage = await calculateTaskProgress(task);
    await task.save();

    // Update parent task progress if this is a subtask
    await updateParentTaskProgress(task._id);

    return res.status(200).json({
      message: "Checklist item deleted successfully",
      task,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post("/comment/create", verifyToken, async (req, res) => {
  try {
    const { taskId, content, parentComment } = req.body;
    const comment = await Comment.create({
      task: taskId,
      author: req.userId,
      content,
      parentComment: parentComment || null
    });
    const populatedComment = await Comment.findById(comment._id)
      .populate("author", "firstName lastName profilePhoto role");
    const task = await Task.findById(taskId);
    
    // Log comment activity
    await logActivity(
      taskId,
      req.userId,
      "comment_added",
      "Added a comment",
      { commentId: comment._id }
    );
    
    const recipients = new Set([
      task.createdBy.toString(),
      ...task.assignedTo.map(id => id.toString())
    ]);
    recipients.delete(req.userId);
    for (const recipientId of recipients) {
      await Notification.create({
        recipient: recipientId,
        sender: req.userId,
        type: "task_comment",
        task: taskId,
        comment: comment._id,
        message: `commented on task: ${task.title}`
      });
    }
    return res.status(201).json({
      message: "Comment created successfully",
      comment: populatedComment
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/comments/task/:taskId", verifyToken, async (req, res) => {
  try {
    const comments = await Comment.find({
      task: req.params.taskId,
      parentComment: null
    })
      .sort({ createdAt: -1 })
      .populate("author", "firstName lastName profilePhoto role");
    return res.status(200).json(comments);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

app.get("/task/:id/activity-log", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .select("activityLog")
      .populate("activityLog.user", "firstName lastName profilePhoto role");
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Sort by timestamp descending (newest first)
    const sortedLog = task.activityLog.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    return res.status(200).json(sortedLog);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/comment/:commentId/replies", verifyToken, async (req, res) => {
  try {
    const replies = await Comment.find({ parentComment: req.params.commentId })
      .sort({ createdAt: 1 })
      .populate("author", "firstName lastName profilePhoto role");
    return res.status(200).json(replies);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.put("/comment/:id", verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      {
        content,
        isEdited: true,
        editedAt: new Date()
      },
      { new: true }
    ).populate("author", "firstName lastName profilePhoto");
    return res.status(200).json({
      message: "Comment updated successfully",
      comment
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.delete("/comment/:id", verifyToken, async (req, res) => {
  try {
    await Comment.deleteMany({ parentComment: req.params.id });
    await Comment.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/conversation/create", verifyToken, async (req, res) => {
  try {
    const { participants, isGroupChat, groupName } = req.body;
    if (!isGroupChat && participants.length === 2) {
      const existingConversation = await Conversation.findOne({
        isGroupChat: false,
        participants: { $all: participants }
      })
        .populate("participants", "firstName lastName profilePhoto lastSeen")
        .populate("lastMessage");
      if (existingConversation) {
        return res.status(200).json(existingConversation);
      }
    }
    const conversation = await Conversation.create({
      participants,
      isGroupChat: isGroupChat || false,
      groupName: groupName || null,
      admin: isGroupChat ? req.userId : null
    });
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "firstName lastName profilePhoto lastSeen")
      .populate("admin", "firstName lastName");
    return res.status(201).json({
      message: "Conversation created successfully",
      conversation: populatedConversation
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/conversations/user/:userId", verifyToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.params.userId
    })
      .sort({ lastMessageTime: -1 })
      .populate("participants", "firstName lastName profilePhoto lastSeen")
      .populate("lastMessage")
      .populate("admin", "firstName lastName");
    return res.status(200).json(conversations);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.post("/message/send", verifyToken, upload.single("media"), async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    let mediaUrl = null;
    let mediaType = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "task-management/messages");
      mediaUrl = result.secure_url;
      mediaType = req.file.mimetype.startsWith("video/") ? "video" :
                  req.file.mimetype.startsWith("image/") ? "image" : "file";
    }
    const message = await Message.create({
      conversation: conversationId,
      sender: req.userId,
      content: content || null,
      mediaUrl,
      mediaType,
      readBy: [{
        user: req.userId,
        readAt: new Date()
      }]
    });
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "firstName lastName profilePhoto");
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageTime: new Date()
    });
    const conversation = await Conversation.findById(conversationId);
    const otherParticipants = conversation.participants.filter(
      p => p.toString() !== req.userId
    );
    for (const participant of otherParticipants) {
      await Notification.create({
        recipient: participant,
        sender: req.userId,
        type: "message",
        message: "sent you a message"
      });
    }
    return res.status(201).json({
      message: "Message sent successfully",
      messageData: populatedMessage
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/messages/conversation/:conversationId", verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const messages = await Message.find({
      conversation: req.params.conversationId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "firstName lastName profilePhoto");
    return res.status(200).json({
      messages: messages.reverse(),
      page,
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.put("/message/:id/read", verifyToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    const alreadyRead = message.readBy.some(
      r => r.user.toString() === req.userId
    );
    if (!alreadyRead) {
      message.readBy.push({
        user: req.userId,
        readAt: new Date()
      });
      await message.save();
    }
    return res.status(200).json({ message: "Message marked as read" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.delete("/message/:id", verifyToken, async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { isDeleted: true });
    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/notifications/user/:userId", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "firstName lastName profilePhoto")
      .populate("task", "title")
      .populate("comment", "content");
    return res.status(200).json(notifications);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.put("/notification/:id/read", verifyToken, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true,
      readAt: new Date()
    });
    return res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.put("/notifications/user/:userId/read-all", verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.params.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/notifications/user/:userId/unread-count", verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.params.userId,
      isRead: false
    });
    return res.status(200).json({ count });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
app.get("/dashboard/:userId", verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const tasksByStatus = await Task.aggregate([
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(userId),
          isArchived: false
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      status: { $nin: ["Completed", "Cancelled"] },
      dueDate: { $lt: new Date() },
      isArchived: false
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tasksDueToday = await Task.countDocuments({
      assignedTo: userId,
      status: { $nin: ["Completed", "Cancelled"] },
      dueDate: { $gte: today, $lt: tomorrow },
      isArchived: false
    });
    await updateUserStats(userId);
    const user = await User.findById(userId).select("stats");
    const recentTasks = await Task.find({
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ],
      isArchived: false
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("createdBy", "firstName lastName")
      .populate("assignedTo", "firstName lastName");
    return res.status(200).json({
      tasksByStatus,
      overdueTasks,
      tasksDueToday,
      stats: user.stats,
      recentTasks
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
mongoose.connect(mongoDBURL).then(() => {
  console.log("App connected to database");
  app.listen(PORT, () => {
    console.log(`App is listening on port ${PORT}`);
  });
}).catch((error) => {
  console.log(error);
});