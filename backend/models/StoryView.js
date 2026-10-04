import mongoose from 'mongoose';

const storyViewSchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story',
      required: [true, 'Story reference is required']
    },
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Viewer user reference is required']
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index prevents duplicate view records for the same viewer on the same story
storyViewSchema.index({ story: 1, viewer: 1 }, { unique: true });
storyViewSchema.index({ story: 1, viewedAt: -1 });
storyViewSchema.index({ viewer: 1, viewedAt: -1 });

const StoryView = mongoose.model('StoryView', storyViewSchema);
export default StoryView;
