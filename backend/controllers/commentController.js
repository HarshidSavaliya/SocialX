import commentService from '../services/commentService.js';

export const addComment = async (req, res, next) => {
  try {
    const id = req.params.postId || req.params.id; // postId
    const { text } = req.body;
    const authorId = req.user._id;

    const comment = await commentService.addComment({
      postId: id,
      authorId,
      text
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment,
      comment: comment
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params; // commentId
    const userId = req.user._id;

    const result = await commentService.deleteComment({
      commentId: id,
      userId
    });

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req, res, next) => {
  try {
    const { id } = req.params; // postId

    const comments = await commentService.getCommentsByPost(id);

    res.status(200).json({
      success: true,
      data: comments
    });
  } catch (error) {
    next(error);
  }
};
