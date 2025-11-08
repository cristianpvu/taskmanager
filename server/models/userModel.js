import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["CEO", "Project Manager", "Team Lead", "Employee", "Intern", "Contractor"],
      required: true,
      default: "Employee",
    },
    department: {
      type: String,
      enum: ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations", "Customer Support"],
      required: true,
    },
    status: {
      type: String,
      maxlength: 200,
      default: "Available",
    },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    stats: {
      tasksCompleted: {
        type: Number,
        default: 0,
      },
      currentStreak: {
        type: Number,
        default: 0,
      },
      longestStreak: {
        type: Number,
        default: 0,
      },
      lastTaskCompletedDate: {
        type: Date,
        default: null,
      },
      tasksInProgress: {
        type: Number,
        default: 0,
      },
      tasksOverdue: {
        type: Number,
        default: 0,
      },
    },
    groups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);