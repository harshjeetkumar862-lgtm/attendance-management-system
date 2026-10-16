const mongoose = require('mongoose');

/**
 * Class / Batch, e.g. "BCA 3rd Semester".
 */
const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, index: true },
    department: { type: String, default: null, trim: true },
    semester: { type: String, default: null, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Class', classSchema);
