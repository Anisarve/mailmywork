const Assignment = require("../models/assignmentModel");
const { deleteFromCloudinary } = require("../config/cloudinary");

async function deleteAssignmentById(id) {
  try {
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return { success: false, message: "Assignment not found in database" };
    }
    
    // Delete from Cloudinary
    await deleteFromCloudinary(assignment.url);
    
    // Delete from database
    await Assignment.findByIdAndDelete(id);
    
    return { success: true, assignment };
  } catch (err) {
    console.error("Error in deleteAssignmentById:", err);
    return { success: false, message: err };
  }
}

module.exports = { deleteAssignmentById };
