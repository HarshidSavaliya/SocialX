import shareService from '../services/shareService.js';

export const sharePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await shareService.sharePost(id, userId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        sharesCount: result.sharesCount
      }
    });
  } catch (error) {
    next(error);
  }
};
