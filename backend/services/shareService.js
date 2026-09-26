import Share from '../models/Share.js';
import Post from '../models/Post.js';

class ShareService {
  async sharePost(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Record share in database
    await Share.create({
      post: postId,
      user: userId
    });

    // Atomically increment shares count
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );

    return {
      success: true,
      message: 'Post shared successfully to your network',
      sharesCount: updatedPost.sharesCount
    };
  }
}

export default new ShareService();
