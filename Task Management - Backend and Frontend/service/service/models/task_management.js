import mongoose from "mongoose";

/**
 * TaskManagementSchema defines the structure for projects, tasks, resource allocation, and time tracking.
 */
const taskManagementSchema = new mongoose.Schema({
  /**
   * The name of the project.
   * @type {String}
   * @required
   */
  projectName: {
    type: String,
    required: true,
    description: "Name of the project",
  },

  /**
   * A brief description of the project.
   * @type {String}
   * @required
   */
  description: {
    type: String,
    required: true,
    description: "Brief description of the project",
  },

  /**
   * The timeline of the project, including start and end dates.
   */
  timeline: {
    startDate: {
      type: Date,
      required: true,
      description: "Start date of the project timeline",
    },
    endDate: {
      type: Date,
      required: true,
      description: "End date of the project timeline",
    },
  },

  /**
   * Resource allocation details.
   */
  resources: [
    {
      /**
       * Resource name or identifier.
       * @type {String}
       * @required
       */
      resourceName: {
        type: String,
        required: true,
        description: "Name or identifier of the resource",
      },

      /**
       * Allocation percentage for the resource.
       * @type {Number}
       * @required
       */
      allocation: {
        type: Number,
        required: true,
        description: "Percentage of the resource allocated",
      },

      /**
       * Role or designation of the resource.
       * @type {String}
       */
      role: {
        type: String,
        description: "Role of the resource in the project",
      },
    },
  ],

  /**
   * Array of tasks associated with the project.
   */
  tasks: [
    {
      taskName: {
        type: String,
        required: true,
        description: "Name of the task",
      },
      description: {
        type: String,
        required: true,
        description: "Brief description of the task",
      },
      status: {
        type: String,
        enum: ["Pending", "In Progress", "Completed"],
        required: true,
        description: "Current status of the task",
      },
      timeline: {
        startDate: {
          type: Date,
          required: true,
          description: "Start date of the task timeline",
        },
        endDate: {
          type: Date,
          required: true,
          description: "End date of the task timeline",
        },
      },
    },
  ],

  /**
   * Time tracking details for the project.
   */
  timeTracking: {
    totalHours: {
      type: Number,
      default: 0,
      description: "Total hours logged for the project",
    },
    logs: [
      {
        /**
         * The date and time the time log entry was created.
         * @type {Date}
         * @required
         */
        logDate: {
          type: Date,
          required: true,
          description: "Date of the time log entry",
        },

        /**
         * Number of hours logged.
         * @type {Number}
         * @required
         */
        hours: {
          type: Number,
          required: true,
          description: "Hours logged for the task/project",
        },

        /**
         * Description of the time log entry.
         * @type {String}
         */
        description: {
          type: String,
          description: "Description of the work done",
        },
      },
    ],
  },
});

/**
 * Add pre-save hook for automatic IDs.
 */
taskManagementSchema.pre("save", function (next) {
  if (this.isNew) {
    this.projectId = this._id; // Auto-generate the projectId
  }
  next();
});

/**
 * TaskManagementModel is a Mongoose model for managing projects and their tasks.
 */
const TaskManagementModel = mongoose.model("TaskManagement", taskManagementSchema);

export default TaskManagementModel;
