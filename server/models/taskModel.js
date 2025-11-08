import mongoose from "mongoose";

const taskSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    titleEncrypted: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    descriptionEncrypted: {
      type: String,
      default: null,
    },
    encryptedForGroups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    }],
    status: {
      type: String,
      enum: ["Open", "In Progress", "Under Review", "Completed", "Blocked", "Cancelled", "Pending"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    color: {
      type: String,
      default: "#3B82F6", // Default blue color
    },
    department: {
      type: String,
      enum: ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations", "Customer Support"],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    assignedGroups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    }],
    dueDate: {
      type: Date,
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    attachments: [{
      url: String,
      publicId: String,
      fileName: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    subtasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    }],
    isClaimed: {
      type: Boolean,
      default: false,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    isOpenForClaims: {
      type: Boolean,
      default: false,
    },
    invitations: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      status: {
        type: String,
        enum: ["Pending", "Accepted", "Declined"],
        default: "Pending",
      },
      invitedAt: {
        type: Date,
        default: Date.now,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    }],
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    checklist: [{
      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
      },
      isCompleted: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      completedAt: {
        type: Date,
        default: null,
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    }],
    tags: [{
      type: String,
      trim: true,
    }],
    reassignCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    reassignHistory: [{
      reassignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      reassignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      reassignedAt: {
        type: Date,
        default: Date.now,
      },
      reason: {
        type: String,
        default: "",
      },
    }],
    activityLog: [{
      type: {
        type: String,
        enum: [
          "created",
          "status_changed",
          "priority_changed",
          "assigned",
          "unassigned",
          "reassigned",
          "self_assigned",
          "due_date_changed",
          "title_changed",
          "description_changed",
          "checklist_added",
          "checklist_completed",
          "checklist_uncompleted",
          "checklist_deleted",
          "subtask_added",
          "subtask_linked",
          "subtask_unlinked",
          "comment_added",
          "attachment_added",
          "attachment_deleted",
          "tag_added",
          "tag_removed",
        ],
        required: true,
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ department: 1 });
taskSchema.index({ isOpenForClaims: 1, isClaimed: 1 });

export const Task = mongoose.model("Task", taskSchema);